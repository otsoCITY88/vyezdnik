import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fullAddress, shortAddress } from "@/lib/format";

const Patch = z.object({
  city: z.string().optional(),
  street: z.string().min(1).optional(),
  house: z.string().min(1).optional(),
  apartment: z.string().nullable().optional(),
  porch: z.string().nullable().optional(),
  subcontractorId: z.string().nullable().optional(),
  contractId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const cur = await prisma.building.findUnique({ where: { id } });
  if (!cur) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const merged = {
    city: parsed.data.city ?? cur.city,
    street: parsed.data.street ?? cur.street,
    house: parsed.data.house ?? cur.house,
    apartment: parsed.data.apartment === undefined ? cur.apartment : parsed.data.apartment,
    porch: parsed.data.porch === undefined ? cur.porch : parsed.data.porch,
  };

  const updated = await prisma.building.update({
    where: { id },
    data: {
      ...Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])),
      shortAddress: shortAddress(merged),
      fullAddress: fullAddress(merged),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [casesN, incomingN] = await prisma.$transaction([
    prisma.case.count({ where: { buildingId: id } }),
    prisma.incomingLetter.count({ where: { buildingId: id } }),
  ]);
  if (casesN || incomingN) {
    return NextResponse.json({
      error: "in_use",
      message: `Невозможно удалить: дел ${casesN}, входящих ${incomingN} ссылаются на этот МКД`,
    }, { status: 409 });
  }
  await prisma.building.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
