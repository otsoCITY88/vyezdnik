import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/edo";
import { OUR_COMPANY } from "@/lib/our-company";
import { safeJSON } from "@/lib/format";

const Body = z.object({
  provider: z.enum(["local", "sbis", "diadoc"]).default("local"),
}).optional();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const providerName = parsed.data?.provider || "local";

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { case: { include: { subcontractor: true } } },
  });
  if (!doc?.renderedDocxPath) return NextResponse.json({ error: "no_file" }, { status: 400 });

  // первый адресат
  const ads = safeJSON<Array<{ contactId: string; role: string }>>(doc.addressees, []);
  const main = ads.find((a) => a.role === "main");
  const mainContact = main ? await prisma.contact.findUnique({ where: { id: main.contactId } }) : null;

  const provider = getProvider(providerName);
  const result = await provider.send({
    documentId: doc.id,
    outgoingNumber: doc.outgoingNumber || "—",
    outgoingDate: doc.outgoingDate || new Date(),
    subject: doc.subject || "",
    docxPath: doc.renderedDocxPath,
    signaturePath: doc.signaturePath || undefined,
    sender: {
      name: OUR_COMPANY.shortName,
      inn: OUR_COMPANY.inn,
      ogrn: OUR_COMPANY.ogrn,
      legalAddress: OUR_COMPANY.legalAddressPrimary,
    },
    recipient: {
      name: doc.case.subcontractor.fullName,
      inn: doc.case.subcontractor.inn || undefined,
      email: mainContact?.email || doc.case.subcontractor.defaultEmail || undefined,
    },
  });

  await prisma.document.update({
    where: { id },
    data: {
      edoStatus: result.status,
      edoTrackId: result.trackId,
      edoProvider: result.provider,
      edoPackagePath: result.packagePath,
      edoSentAt: new Date(),
    },
  });

  await prisma.caseEvent.create({
    data: {
      caseId: doc.caseId,
      occurredAt: new Date(),
      kind: "letter_sent",
      title: `Отправлено в ЭДО · ${doc.outgoingNumber}`,
      description: `Провайдер ${result.provider}, trackId ${result.trackId}`,
      payload: JSON.stringify({ documentId: doc.id, ...result }),
    },
  });

  return NextResponse.json(result);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Запрос статуса
  const { id } = await ctx.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.edoTrackId || !doc.edoProvider) return NextResponse.json({ error: "not_sent" }, { status: 400 });
  const provider = getProvider(doc.edoProvider as "local");
  const r = await provider.getStatus(doc.edoTrackId);
  await prisma.document.update({
    where: { id },
    data: {
      edoStatus: r.status,
      edoDeliveredAt: r.deliveredAt,
      ...(r.signedAt ? { signedAt: r.signedAt } : {}),
    },
  });
  return NextResponse.json(r);
}
