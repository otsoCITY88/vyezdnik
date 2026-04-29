import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({ caseId: z.string() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  const incoming = await prisma.incomingLetter.findUnique({ where: { id } });
  if (!incoming) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (incoming.linkedCaseId) return NextResponse.json({ error: "already_linked" }, { status: 409 });

  await prisma.incomingLetter.update({
    where: { id }, data: { linkedCaseId: parsed.data.caseId },
  });
  await prisma.caseEvent.create({
    data: {
      caseId: parsed.data.caseId,
      occurredAt: new Date(),
      kind: "incoming",
      title: `Привязано входящее ${incoming.number}`,
      description: incoming.subject || undefined,
    },
  });
  return NextResponse.json({ ok: true });
}
