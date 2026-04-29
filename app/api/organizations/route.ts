import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  kind: z.enum(["customer", "subcontractor", "administration", "prosecutor", "fund", "balance_holder", "ours", "other"]),
  shortName: z.string().min(1),
  fullName: z.string().min(1),
  inn: z.string().optional().or(z.literal("")),
  kpp: z.string().optional().or(z.literal("")),
  ogrn: z.string().optional().or(z.literal("")),
  legalAddress: z.string().optional().or(z.literal("")),
  defaultEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const created = await prisma.organization.create({
    data: {
      kind: parsed.data.kind,
      shortName: parsed.data.shortName,
      fullName: parsed.data.fullName,
      inn: parsed.data.inn || null,
      kpp: parsed.data.kpp || null,
      ogrn: parsed.data.ogrn || null,
      legalAddress: parsed.data.legalAddress || null,
      defaultEmail: parsed.data.defaultEmail || null,
      notes: parsed.data.notes || null,
    },
  });
  return NextResponse.json({ id: created.id });
}

export async function GET() {
  const all = await prisma.organization.findMany({ orderBy: [{ kind: "asc" }, { shortName: "asc" }] });
  return NextResponse.json(all);
}
