import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFileRevision } from "@/lib/file-revisions";

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
  const requestedRemedyDate = String(form.get("requestedRemedyDate") || "");
  const buildingId = String(form.get("buildingId") || "");
  const pageCount = Number(form.get("pageCount") || 0);

  if (!fromOrganizationId || !number || !incomingDate) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // 1. Создаём запись входящего без файла — нужен id для пути версии.
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
      requestedRemedyDate: requestedRemedyDate ? new Date(requestedRemedyDate) : null,
      buildingId: buildingId || null,
      attachedFile: null,
      pageCount: pageCount || null,
    },
  });

  // 2. Если файл есть — сохраняем через версионирование (v1) и обновляем
  // attachedFile на путь к этой версии.
  if (file && file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const { path } = await saveFileRevision({
      ownerType: "incoming",
      ownerId: created.id,
      buffer: buf,
      filename: file.name,
      mime: file.type || undefined,
    });
    await prisma.incomingLetter.update({
      where: { id: created.id },
      data: { attachedFile: path },
    });
  }

  return NextResponse.json({ id: created.id });
}
