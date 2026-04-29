import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

const PlanBody = z.object({
  visitDate: z.string(),
  kind: z.enum(["initial", "repeat", "final"]),
  members: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
  notes: z.string().optional(),
});

const RecordBody = z.object({
  visitDate: z.string(),
  kind: z.enum(["initial", "repeat", "final"]),
  result: z.enum(["defects_found", "resolved", "partially_resolved"]),
  findings: z.string().optional().or(z.literal("")),
  members: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
});

// POST /api/cases/[id]/visits — создаёт ЛИБО plan ЛИБО done в зависимости от поля mode
// mode=plan  → status: "planned", без result/findings/photos
// mode=record → status: "done", с result/findings/photos (как старое поведение)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await ctx.params;

  const ct = req.headers.get("content-type") || "";
  let mode: "plan" | "record" = "record";
  let visitDate: string, kind: "initial" | "repeat" | "final";
  let result: string | undefined, findings = "", notes = "";
  let members: Array<{ role: string; name: string }> = [];
  const photoFiles: File[] = [];

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    mode = (String(form.get("mode") || "record") as "plan" | "record");
    visitDate = String(form.get("visitDate") || "");
    kind = String(form.get("kind") || "repeat") as "initial" | "repeat" | "final";
    if (mode === "record") {
      result = String(form.get("result") || "") || undefined;
      findings = String(form.get("findings") || "");
    } else {
      notes = String(form.get("notes") || "");
    }
    try { members = JSON.parse(String(form.get("members") || "[]")); }
    catch { members = []; }
    for (const [k, v] of form.entries()) {
      if (k === "photo" && v instanceof File && v.size > 0) photoFiles.push(v);
    }
  } else {
    const json = await req.json();
    mode = (json.mode === "plan" ? "plan" : "record");
    if (mode === "plan") {
      const parsed = PlanBody.safeParse(json);
      if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
      visitDate = parsed.data.visitDate;
      kind = parsed.data.kind;
      members = parsed.data.members;
      notes = parsed.data.notes || "";
    } else {
      const parsed = RecordBody.safeParse(json);
      if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
      visitDate = parsed.data.visitDate;
      kind = parsed.data.kind;
      result = parsed.data.result;
      findings = parsed.data.findings || "";
      members = parsed.data.members;
    }
  }

  // Сохраняем фото (только в режиме record)
  const photos: Array<{ path: string; mime: string; size: number; takenAt: string }> = [];
  if (mode === "record" && photoFiles.length) {
    const dir = join(STORAGE, "visits", caseId);
    mkdirSync(dir, { recursive: true });
    for (const f of photoFiles) {
      const ext = (f.name.match(/\.\w+$/)?.[0] || ".jpg");
      const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const fp = join(dir, fname);
      writeFileSync(fp, Buffer.from(await f.arrayBuffer()));
      photos.push({ path: fp, mime: f.type || "image/jpeg", size: f.size, takenAt: new Date().toISOString() });
    }
  }

  const visit = await prisma.visit.create({
    data: {
      caseId,
      visitDate: new Date(visitDate),
      kind,
      status: mode === "plan" ? "planned" : "done",
      result: mode === "record" ? (result || null) : null,
      findings: mode === "record" ? (findings || null) : (notes || null),
      commissionMembers: JSON.stringify(members),
      photos: photos.length ? JSON.stringify(photos) : null,
      recordedAt: mode === "record" ? new Date() : null,
    },
  });

  await prisma.caseEvent.create({
    data: {
      caseId,
      occurredAt: new Date(visitDate),
      kind: "visit",
      title: mode === "plan"
        ? `Запланирован ${kindLabel(kind)} выезд на ${formatDate(visitDate)}`
        : `${kindLabel(kind, true)} выезд комиссии${photos.length ? ` · ${photos.length} фото` : ""}`,
      description: mode === "record"
        ? (findings || (result === "resolved" ? "Замечания устранены." : result === "defects_found" ? "Зафиксированы дефекты." : undefined))
        : (notes || undefined),
      payload: JSON.stringify({ visitId: visit.id, mode, photos: photos.length }),
    },
  });

  // Перевод состояния дела только при фактической фиксации
  if (mode === "record" && result === "resolved") {
    await prisma.case.update({ where: { id: caseId }, data: { state: "remedy_confirmed" } });
  }

  return NextResponse.json({ id: visit.id, status: visit.status, photos: photos.length });
}

function kindLabel(k: string, capital = false): string {
  const labels = { initial: "первичный", repeat: "повторный", final: "финальный" } as Record<string, string>;
  const v = labels[k] || k;
  return capital ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
