import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BODIES } from "@/lib/template-defaults";
import { TEMPLATE_CATALOG } from "@/lib/workflow";
import { renderTemplateBodyToDocxBuffer, TemplateBody } from "@/lib/template-builder";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATES_DIR = join(process.cwd(), "templates");

export async function GET(_req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const meta = TEMPLATE_CATALOG.find((t) => t.kind === kind);
  if (!meta) return NextResponse.json({ error: "unknown_kind" }, { status: 404 });
  const db = await prisma.documentTemplate.findUnique({ where: { kind } });
  const body = db?.body ? JSON.parse(db.body) : DEFAULT_BODIES[kind] || null;
  return NextResponse.json({
    kind,
    title: db?.title || meta.title,
    subtitle: db?.subtitle || meta.subtitle,
    availableIn: meta.availableIn,
    transitionsTo: meta.transitionsTo,
    body,
    source: db?.source || "code",
    active: db?.active ?? true,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const json = await req.json();
  // запись body — пересобирает .docx
  const body = json.body as TemplateBody | undefined;
  const data: { title?: string; subtitle?: string | null; body?: string | null; source?: string; docxPath?: string | null; active?: boolean } = {};
  if (typeof json.title === "string") data.title = json.title;
  if (typeof json.subtitle === "string") data.subtitle = json.subtitle || null;
  if (typeof json.active === "boolean") data.active = json.active;
  if (body) {
    data.body = JSON.stringify(body);
    data.source = "builder";
    // пересобираем .docx
    mkdirSync(TEMPLATES_DIR, { recursive: true });
    const buf = await renderTemplateBodyToDocxBuffer(body);
    const fp = join(TEMPLATES_DIR, `${kind}.docx`);
    writeFileSync(fp, buf);
    data.docxPath = fp;
  }
  const updated = await prisma.documentTemplate.upsert({
    where: { kind },
    create: { kind, title: data.title || kind, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

// POST file: загрузка готового .docx как шаблона
export async function POST(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "not_docx" }, { status: 400 });

  mkdirSync(TEMPLATES_DIR, { recursive: true });
  const fp = join(TEMPLATES_DIR, `${kind}.docx`);
  const buf = Buffer.from(await file.arrayBuffer());
  writeFileSync(fp, buf);

  await prisma.documentTemplate.upsert({
    where: { kind },
    create: { kind, title: kind, source: "uploaded", docxPath: fp },
    update: { source: "uploaded", docxPath: fp },
  });
  return NextResponse.json({ ok: true, size: buf.length });
}

// DELETE: сбросить кастомизацию (вернуть к дефолтам)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  await prisma.documentTemplate.delete({ where: { kind } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
