import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  outcome: z.enum(["resolved", "withdrawn_volumes", "litigation"]),
  note: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await ctx.params;
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const d = parsed.data;

  await prisma.case.update({
    where: { id: caseId },
    data: { state: "closed", outcome: d.outcome, closedAt: new Date() },
  });

  await prisma.caseEvent.create({
    data: {
      caseId,
      occurredAt: new Date(),
      kind: "state_changed",
      title: `Дело закрыто · ${
        d.outcome === "resolved" ? "замечания устранены"
        : d.outcome === "withdrawn_volumes" ? "объёмы изъяты у СПО"
        : "перешло в судебное производство"
      }`,
      description: d.note || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Возобновить дело (отменить закрытие)
  const { id: caseId } = await ctx.params;
  await prisma.case.update({
    where: { id: caseId },
    data: { state: "incoming_received", outcome: null, closedAt: null },
  });
  return NextResponse.json({ ok: true });
}
