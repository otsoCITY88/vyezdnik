import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  number: z.string().min(1),
  date: z.string(),
  subcontractorId: z.string(),
  warranty: z.array(z.string()).optional().default([]),
  remedy: z.array(z.string()).optional().default([]),
  responsibility: z.array(z.string()).optional().default([]),
  info_request: z.array(z.string()).optional().default([]),
  penalty: z.array(z.string()).optional().default([]),
  penaltyAmountRub: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;
  const created = await prisma.contract.create({
    data: {
      number: d.number, date: new Date(d.date),
      subcontractorId: d.subcontractorId,
      clauses: JSON.stringify({
        warranty: d.warranty, remedy: d.remedy,
        responsibility: d.responsibility, info_request: d.info_request,
        penalty: d.penalty,
      }),
      penaltyAmount: d.penaltyAmountRub ? d.penaltyAmountRub * 100 : null,
    },
  });
  return NextResponse.json({ id: created.id });
}

export async function GET() {
  const all = await prisma.contract.findMany({
    include: { subcontractor: true, _count: { select: { buildings: true, cases: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(all);
}
