// POST /api/files/revisions/<id>
// Откат к выбранной версии: создаём новую версию с тем же содержимым,
// которая становится текущей. Обновляем указатель на файл в owner-объекте
// (IncomingLetter.attachedFile / Document.renderedDocxPath).
//
// Старые версии не трогаем — история сохраняется.

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFileRevision, getRevision, type OwnerType } from "@/lib/file-revisions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rev = await getRevision(id);
  if (!rev) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = readFileSync(rev.path);
  } catch {
    return NextResponse.json({ error: "file_missing_on_disk" }, { status: 410 });
  }

  // Резолвим внутреннего пользователя по email — для uploadedById.
  const dbUser = session.user.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;

  const result = await saveFileRevision({
    ownerType: rev.ownerType as OwnerType,
    ownerId: rev.ownerId,
    buffer: buf,
    filename: rev.filename,
    mime: rev.mime || undefined,
    comment: `Откат к v${rev.version}`,
    uploadedById: dbUser?.id,
  });

  // Обновляем указатель на текущий файл в owner-объекте.
  // visit_photo лежит внутри JSON-массива photos и требует более сложного
  // обновления — пока пропускаем (фото обычно не откатывают).
  if (rev.ownerType === "incoming") {
    await prisma.incomingLetter.update({
      where: { id: rev.ownerId },
      data: { attachedFile: result.path },
    });
  } else if (rev.ownerType === "document") {
    await prisma.document.update({
      where: { id: rev.ownerId },
      data: { renderedDocxPath: result.path },
    });
  }

  // Аудит-запись: откат версии файла — операция повышенного риска,
  // важно сохранить кто и когда это сделал.
  await prisma.auditLog.create({
    data: {
      userId: dbUser?.id || null,
      action: "file.rollback",
      entityType: rev.ownerType,
      entityId: rev.ownerId,
      payload: JSON.stringify({
        revisionId: rev.id,
        rolledBackToVersion: rev.version,
        newVersion: result.version,
        filename: rev.filename,
      }),
    },
  });

  return NextResponse.json(result);
}
