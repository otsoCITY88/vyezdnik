import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Patch = z.object({
  number: z.string().min(1).optional(),
  date: z.string().optional(),
  subcontractorId: z.string().optional(),
  warranty: z.array(z.string()).optional(),
  remedy: z.array(z.string()).optional(),
  responsibility: z.array(z.string()).optional(),
  info_request: z.array(z.string()).optional(),
  penalty: z.array(z.string()).optional(),
  penaltyAmountRub: z.number().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;

  const cur = await prisma.contract.findUnique({ where: { id } });
  if (!cur) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const clauses = JSON.parse(cur.clauses || "{}");
  const merged = {
    warranty: d.warranty ?? clauses.warranty ?? [],
    remedy: d.remedy ?? clauses.remedy ?? [],
    responsibility: d.responsibility ?? clauses.responsibility ?? [],
    info_request: d.info_request ?? clauses.info_request ?? [],
    penalty: d.penalty ?? clauses.penalty ?? [],
  };

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(d.number !== undefined ? { number: d.number } : {}),
      ...(d.date !== undefined ? { date: new Date(d.date) } : {}),
      ...(d.subcontractorId !== undefined ? { subcontractorId: d.subcontractorId } : {}),
      clauses: JSON.stringify(merged),
      ...(d.penaltyAmountRub !== undefined ? { penaltyAmount: d.penaltyAmountRub === null ? null : d.penaltyAmountRub * 100 } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [casesN, buildingsN] = await prisma.$transaction([
    prisma.case.count({ where: { contractId: id } }),
    prisma.building.count({ where: { contractId: id } }),
  ]);
  if (casesN || buildingsN) {
    return NextResponse.json({
      error: "in_use",
      message: `Невозможно удалить: дел ${casesN}, объектов ${buildingsN} ссылаются на договор`,
    }, { status: 409 });
  }
  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
