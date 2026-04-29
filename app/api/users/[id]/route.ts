import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Patch = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  shortName: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  isHead: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const updated = await prisma.user.update({
    where: { id },
    data: Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])),
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const used = await prisma.case.count({ where: { responsibleUserId: id } });
  if (used) return NextResponse.json({ error: "in_use", message: `Назначен ответственным по ${used} дел(у/ам)` }, { status: 409 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
