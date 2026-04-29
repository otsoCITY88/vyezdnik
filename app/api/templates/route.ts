import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_CATALOG } from "@/lib/workflow";
import { DEFAULT_BODIES } from "@/lib/template-defaults";

const Body = z.object({
  kind: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional().or(z.literal("")),
  availableIn: z.array(z.string()),
  transitionsTo: z.array(z.string()),
  body: z.unknown().optional(),
});

export async function GET() {
  // Возвращаем merged: catalog + DB metadata + default bodies (если в БД нет body)
  const dbItems = await prisma.documentTemplate.findMany();
  const dbByKind = new Map(dbItems.map((t) => [t.kind, t]));
  const out = TEMPLATE_CATALOG.map((c) => {
    const db = dbByKind.get(c.kind);
    return {
      kind: c.kind,
      title: db?.title || c.title,
      subtitle: db?.subtitle || c.subtitle,
      source: db?.source || "code",
      active: db?.active ?? true,
      availableIn: c.availableIn,
      transitionsTo: c.transitionsTo,
      hasBody: !!(db?.body) || !!DEFAULT_BODIES[c.kind],
      hasUploadedDocx: !!db?.docxPath,
      updatedAt: db?.updatedAt,
    };
  });
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;
  const created = await prisma.documentTemplate.upsert({
    where: { kind: d.kind },
    create: {
      kind: d.kind, title: d.title, subtitle: d.subtitle || null,
      workflow: JSON.stringify({ availableIn: d.availableIn, transitionsTo: d.transitionsTo }),
      body: d.body ? JSON.stringify(d.body) : null,
      source: d.body ? "builder" : "code",
    },
    update: {
      title: d.title, subtitle: d.subtitle || null,
      workflow: JSON.stringify({ availableIn: d.availableIn, transitionsTo: d.transitionsTo }),
      body: d.body ? JSON.stringify(d.body) : null,
      source: d.body ? "builder" : "code",
    },
  });
  return NextResponse.json({ id: created.id });
}
