import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Patch = z.object({
  lastName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  middleName: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  dativePosition: z.string().nullable().optional(),
  dativeName: z.string().nullable().optional(),
  vocativeName: z.string().nullable().optional(),
  shortName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isOurSignatory: z.boolean().optional(),
  isOurExecutor: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const updated = await prisma.contact.update({
    where: { id },
    data: Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])),
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Защита: используется ли как подписант где-либо
  const used = await prisma.document.count({ where: { signatoryId: id } });
  if (used) return NextResponse.json({ error: "in_use", message: `Контакт указан в ${used} документ(е/ах) как подписант` }, { status: 409 });
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
