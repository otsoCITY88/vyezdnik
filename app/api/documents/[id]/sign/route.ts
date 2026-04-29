import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

// POST: загрузка файла подписи (.sig)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  const signerName = String(form.get("signerName") || "");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const fingerprint = createHash("sha1").update(buf).digest("hex");

  mkdirSync(join(STORAGE, "signatures"), { recursive: true });
  const fname = `${id}_${Date.now()}.sig`;
  const fp = join(STORAGE, "signatures", fname);
  writeFileSync(fp, buf);

  const updated = await prisma.document.update({
    where: { id },
    data: {
      signaturePath: fp,
      signatureFingerprint: fingerprint,
      signerName: signerName || null,
      signedAt: new Date(),
      status: "signed",
    },
  });

  await prisma.caseEvent.create({
    data: {
      caseId: updated.caseId,
      occurredAt: new Date(),
      kind: "letter_sent",
      title: `Документ подписан УКЭП · ${updated.outgoingNumber || ""}`,
      description: `Подписант: ${signerName || "—"} · отпечаток ${fingerprint.slice(0, 16)}…`,
    },
  });

  return NextResponse.json({ ok: true, fingerprint, signedAt: updated.signedAt });
}

// DELETE: снять подпись
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.document.update({
    where: { id },
    data: { signaturePath: null, signatureFingerprint: null, signerName: null, signedAt: null, status: "rendered" },
  });
  return NextResponse.json({ ok: true });
}
