import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

// PATCH /api/cases/[id]/visits/[visitId] — зафиксировать запланированный визит,
// либо изменить дату/состав запланированного.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; visitId: string }> }) {
  const { id: caseId, visitId } = await ctx.params;

  const ct = req.headers.get("content-type") || "";

  // Сценарий 1: multipart (фиксация с фото)
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const result = String(form.get("result") || "") || undefined;
    const findings = String(form.get("findings") || "");
    let members: Array<{ role: string; name: string }> = [];
    try { members = JSON.parse(String(form.get("members") || "[]")); }
    catch { members = []; }
    const visitDateStr = String(form.get("visitDate") || "");

    const photoFiles: File[] = [];
    for (const [k, v] of form.entries()) {
      if (k === "photo" && v instanceof File && v.size > 0) photoFiles.push(v);
    }

    // Сохраняем новые фото поверх существующих
    const existing = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const photos: Array<{ path: string; mime: string; size: number; takenAt: string }> =
      existing.photos ? JSON.parse(existing.photos) : [];

    if (photoFiles.length) {
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

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: "done",
        result: result || null,
        findings: findings || null,
        commissionMembers: members.length ? JSON.stringify(members) : existing.commissionMembers,
        photos: photos.length ? JSON.stringify(photos) : null,
        visitDate: visitDateStr ? new Date(visitDateStr) : existing.visitDate,
        recordedAt: new Date(),
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId,
        occurredAt: new Date(),
        kind: "visit",
        title: `Зафиксирован выезд (${kindLabel(existing.kind)})${photoFiles.length ? ` · ${photoFiles.length} фото` : ""}`,
        description: findings || (result === "resolved" ? "Замечания устранены." : result === "defects_found" ? "Зафиксированы дефекты." : undefined),
        payload: JSON.stringify({ visitId, fromPlanned: existing.status === "planned" }),
      },
    });

    if (result === "resolved") {
      await prisma.case.update({ where: { id: caseId }, data: { state: "remedy_confirmed" } });
    }

    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  // Сценарий 2: JSON — простой апдейт полей запланированного (перенос даты, изменение состава)
  const json = await req.json();
  const Body = z.object({
    visitDate: z.string().optional(),
    kind: z.enum(["initial", "repeat", "final"]).optional(),
    members: z.array(z.object({ role: z.string(), name: z.string() })).optional(),
    notes: z.string().optional(),
    status: z.enum(["planned", "done", "cancelled"]).optional(),
  });
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const updated = await prisma.visit.update({
    where: { id: visitId },
    data: {
      ...(parsed.data.visitDate ? { visitDate: new Date(parsed.data.visitDate) } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.members ? { commissionMembers: JSON.stringify(parsed.data.members) } : {}),
      ...(parsed.data.notes !== undefined ? { findings: parsed.data.notes || null } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

// DELETE /api/cases/[id]/visits/[visitId] — отменить запланированный
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; visitId: string }> }) {
  const { id: caseId, visitId } = await ctx.params;
  const v = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (v.status === "done") {
    return NextResponse.json({ error: "cannot_delete_done", message: "Состоявшийся визит удалить нельзя" }, { status: 409 });
  }
  await prisma.visit.delete({ where: { id: visitId } });

  await prisma.caseEvent.create({
    data: {
      caseId,
      occurredAt: new Date(),
      kind: "visit",
      title: `Отменён запланированный выезд на ${formatDate(v.visitDate.toISOString())}`,
      payload: JSON.stringify({ visitId }),
    },
  });
  return NextResponse.json({ ok: true });
}

function kindLabel(k: string): string {
  return ({ initial: "первичный", repeat: "повторный", final: "финальный" } as Record<string, string>)[k] || k;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
