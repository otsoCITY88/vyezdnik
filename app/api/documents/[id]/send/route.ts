import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { dateLong } from "@/lib/format";
import { safeJSON } from "@/lib/format";

const Body = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional().default([]),
  message: z.string().optional(),
}).optional();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { case: { include: { building: true, subcontractor: true } } },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!doc.renderedDocxPath) return NextResponse.json({ error: "no_file", message: "Документ ещё не сохранён" }, { status: 400 });

  // Если адресаты не переданы — берём из документа (Contact.email по addresseeId / copyContactIds)
  let to = parsed.data?.to || [];
  let cc = parsed.data?.cc || [];
  if (to.length === 0) {
    const addressees = safeJSON<Array<{ contactId: string; role: string }>>(doc.addressees, []);
    const contactIds = addressees.map((a) => a.contactId);
    const contacts = await prisma.contact.findMany({ where: { id: { in: contactIds } } });
    const byId = new Map(contacts.map((c) => [c.id, c]));
    for (const a of addressees) {
      const c = byId.get(a.contactId);
      if (!c?.email) continue;
      (a.role === "main" ? to : cc).push(c.email);
    }
  }
  if (to.length === 0) {
    return NextResponse.json({ error: "no_recipients", message: "У адресатов документа не указан e-mail" }, { status: 400 });
  }

  const subject = doc.subject || `Письмо ${doc.outgoingNumber} от ${dateLong(doc.outgoingDate)}`;
  const intro = parsed.data?.message
    || `Уважаемые коллеги!\n\nНаправляем письмо ${doc.outgoingNumber} от ${dateLong(doc.outgoingDate)} по объекту ${doc.case.building.fullAddress}.\n\nС уважением,\nООО «РКС-НР»`;

  const result = await sendMail({
    to, cc,
    subject,
    text: intro,
    attachments: [{
      filename: doc.renderedDocxPath.split("/").pop() || "document.docx",
      path: doc.renderedDocxPath,
    }],
  });

  // Обновим документ
  await prisma.document.update({
    where: { id },
    data: { status: "sent" },
  });

  await prisma.caseEvent.create({
    data: {
      caseId: doc.caseId,
      occurredAt: new Date(),
      kind: "letter_sent",
      title: `Отправлено по e-mail · ${doc.outgoingNumber}`,
      description: `${result.delivery === "smtp" ? "SMTP" : "dev outbox"} → ${to.join(", ")}${cc.length ? ` (cc: ${cc.join(", ")})` : ""}`,
      payload: JSON.stringify({ documentId: doc.id, ...result }),
    },
  });

  return NextResponse.json(result);
}
