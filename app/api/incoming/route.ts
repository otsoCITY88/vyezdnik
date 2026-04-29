import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const fromOrganizationId = String(form.get("fromOrganizationId") || "");
  const number = String(form.get("number") || "");
  const incomingDate = String(form.get("incomingDate") || "");
  const subject = String(form.get("subject") || "");
  const applicantName = String(form.get("applicantName") || "");
  const applicantOrigin = String(form.get("applicantOrigin") || "");
  const applicantLetterNumber = String(form.get("applicantLetterNumber") || "");
  const applicantLetterDate = String(form.get("applicantLetterDate") || "");
  const buildingId = String(form.get("buildingId") || "");
  const pageCount = Number(form.get("pageCount") || 0);

  if (!fromOrganizationId || !number || !incomingDate) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // Сохраним файл (если есть)
  let attachedFile: string | null = null;
  if (file && file instanceof File && file.size > 0) {
    mkdirSync(join(STORAGE, "incoming"), { recursive: true });
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Zа-яА-Я0-9._-]+/g, "_")}`;
    const fullPath = join(STORAGE, "incoming", safeName);
    const ab = await file.arrayBuffer();
    writeFileSync(fullPath, Buffer.from(ab));
    attachedFile = fullPath;
  }

  const created = await prisma.incomingLetter.create({
    data: {
      fromOrganizationId,
      number,
      incomingDate: new Date(incomingDate),
      subject: subject || null,
      applicantName: applicantName || null,
      applicantOrigin: applicantOrigin || null,
      applicantLetterNumber: applicantLetterNumber || null,
      applicantLetterDate: applicantLetterDate ? new Date(applicantLetterDate) : null,
      buildingId: buildingId || null,
      attachedFile,
      pageCount: pageCount || null,
    },
  });

  return NextResponse.json({ id: created.id });
}
