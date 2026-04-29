import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderTemplate, saveRendered } from "@/lib/docgen";
import { nextOutgoingNumber } from "@/lib/numbering";
import { TEMPLATE_KINDS, templateByKind, CaseState } from "@/lib/workflow";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const Body = z.object({
  caseId: z.string(),
  templateKind: z.enum(TEMPLATE_KINDS),
  addresseeId: z.string(),
  copyContactIds: z.array(z.string()).optional().default([]),
  signatoryId: z.string(),
  executorIds: z.array(z.string()).optional().default([]),
  subject: z.string().optional(),
  spoResponseDate: z.string().optional(),
  nextVisitDate: z.string().optional(),
  warrantyRemedyDate: z.string().optional(),
  remedyDate: z.string().optional(),
  reportDate: z.string().optional(),
  outcomeText: z.string().optional(),
  requestLetterNumber: z.string().optional(),
  requestLetterDate: z.string().optional(),
  requestDeadline: z.string().optional(),
  attachments: z.array(z.object({ title: z.string(), pages: z.number().nullable().optional() })).optional().default([]),
  action: z.enum(["download", "save"]).default("save"),
});

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const isDownload = url.searchParams.get("download") === "1";

  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const action = isDownload ? "download" : data.action;

  // 1) Нумерация — в save-режиме инкрементируем, в download — оставим как preview
  const outgoingNumber = action === "save"
    ? await nextOutgoingNumber()
    : (await prisma.outgoingNumberCounter.findUnique({ where: { prefix: "02" } }))
        ? `02/${String(((await prisma.outgoingNumberCounter.findUnique({ where: { prefix: "02" } }))!.current + 1)).padStart(4, "0")}`
        : "02/0001";

  const outgoingDate = new Date();

  // 2) Render
  const tpl = templateByKind(data.templateKind);
  if (!tpl) return NextResponse.json({ error: "unknown_template" }, { status: 400 });

  const rendered = await renderTemplate({
    caseId: data.caseId,
    templateKind: data.templateKind,
    outgoingNumber, outgoingDate,
    subject: data.subject,
    addresseeId: data.addresseeId,
    copyContactIds: data.copyContactIds,
    signatoryId: data.signatoryId,
    executorIds: data.executorIds,
    spoResponseDate: data.spoResponseDate ? new Date(data.spoResponseDate) : undefined,
    nextVisitDate: data.nextVisitDate ? new Date(data.nextVisitDate) : undefined,
    warrantyRemedyDate: data.warrantyRemedyDate ? new Date(data.warrantyRemedyDate) : undefined,
    remedyDate: data.remedyDate ? new Date(data.remedyDate) : undefined,
    reportDate: data.reportDate ? new Date(data.reportDate) : undefined,
    outcomeText: data.outcomeText,
    requestLetterNumber: data.requestLetterNumber,
    requestLetterDate: data.requestLetterDate ? new Date(data.requestLetterDate) : undefined,
    requestDeadline: data.requestDeadline ? new Date(data.requestDeadline) : undefined,
    attachments: data.attachments,
  });

  // 3) Если save — сохраняем в БД и переводим состояние
  if (action === "save") {
    const filePath = saveRendered(rendered.buffer, rendered.filename);

    const document = await prisma.document.create({
      data: {
        caseId: data.caseId,
        templateKind: data.templateKind,
        outgoingNumber, outgoingDate,
        subject: data.subject,
        payload: JSON.stringify(rendered.payload),
        addressees: JSON.stringify([
          { contactId: data.addresseeId, role: "main" },
          ...data.copyContactIds.map((id) => ({ contactId: id, role: "copy" })),
        ]),
        signatoryId: data.signatoryId,
        executorIds: JSON.stringify(data.executorIds),
        attachments: JSON.stringify(data.attachments),
        renderedDocxPath: filePath,
        status: "rendered",
      },
    });

    // обновляем дедлайны
    const newDeadlines: Record<string, string> = {};
    if (data.spoResponseDate) newDeadlines.spo_response = data.spoResponseDate;
    if (data.nextVisitDate) newDeadlines.next_visit = data.nextVisitDate;
    if (data.warrantyRemedyDate) newDeadlines.warranty_remedy = data.warrantyRemedyDate;
    if (data.remedyDate) newDeadlines.remedy = data.remedyDate;

    // переход состояния — берём первое из transitionsTo
    const nextState = (tpl.transitionsTo[0] || undefined) as CaseState | undefined;

    await prisma.case.update({
      where: { id: data.caseId },
      data: {
        ...(nextState ? { state: nextState } : {}),
        ...(Object.keys(newDeadlines).length ? { deadlines: JSON.stringify(newDeadlines) } : {}),
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: data.caseId,
        occurredAt: outgoingDate,
        kind: "letter_sent",
        title: `${labelByKind(data.templateKind)} · ${outgoingNumber}`,
        description: `Подписант: ${(await prisma.contact.findUnique({ where: { id: data.signatoryId } }))?.shortName || "—"}.`,
        payload: JSON.stringify({ documentId: document.id, templateKind: data.templateKind }),
      },
    });

    await logAudit({
      action: "document.generate",
      entityType: "document",
      entityId: document.id,
      payload: { caseId: data.caseId, templateKind: data.templateKind, outgoingNumber },
    });

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      outgoingNumber,
      file: rendered.filename,
    });
  }

  // download
  return new NextResponse(rendered.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(rendered.filename)}`,
    },
  });
}

function labelByKind(k: string): string {
  return ({
    T1_ao_mkd: "Акт осмотра МКД",
    T3_letter_to_spo_remedy: "Письмо в СПО · Об устранении",
    T5_reply_to_ppk: "Ответ в ППК",
    T6_letter_to_spo_on_defects_act: "Письмо в СПО · на основании Акта Н/Д",
    T7_warranty_letter: "О гарантиях субподрядчика",
    T8_claim_no_info: "Претензия за непредоставление информации",
  } as Record<string, string>)[k] || k;
}
