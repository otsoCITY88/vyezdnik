import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Patch = z.object({
  kind: z.enum(["customer", "subcontractor", "administration", "prosecutor", "fund", "balance_holder", "ours", "other"]).optional(),
  shortName: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  inn: z.string().nullable().optional(),
  kpp: z.string().nullable().optional(),
  ogrn: z.string().nullable().optional(),
  legalAddress: z.string().nullable().optional(),
  defaultEmail: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const updated = await prisma.organization.update({
    where: { id },
    data: Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])),
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Защита: нельзя удалить, если есть связанные сущности
  const used = await prisma.$transaction([
    prisma.case.count({ where: { subcontractorId: id } }),
    prisma.contract.count({ where: { subcontractorId: id } }),
    prisma.building.count({ where: { subcontractorId: id } }),
    prisma.incomingLetter.count({ where: { fromOrganizationId: id } }),
    prisma.contact.count({ where: { organizationId: id } }),
  ]);
  const [casesN, contractsN, buildingsN, incomingN, contactsN] = used;
  if (casesN || contractsN || buildingsN || incomingN || contactsN) {
    return NextResponse.json({
      error: "in_use",
      message: `Невозможно удалить: дел ${casesN}, договоров ${contractsN}, объектов ${buildingsN}, входящих ${incomingN}, контактов ${contactsN}`,
    }, { status: 409 });
  }

  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const o = await prisma.organization.findUnique({ where: { id }, include: { contacts: true, contracts: true } });
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(o);
}
