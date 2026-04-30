// Хелпер версионируемой записи файлов.
//
// Использование (пример для входящего письма):
//   const { path } = await saveFileRevision({
//     ownerType: "incoming",
//     ownerId: incoming.id,
//     buffer: pdfBuffer,
//     filename: "letter.pdf",
//     mime: "application/pdf",
//   });
//   await prisma.incomingLetter.update({ where: { id: incoming.id }, data: { attachedFile: path } });
//
// Сохраняет файл в `<STORAGE>/<subdir>/<ownerId>/v<N>_<safeFilename>`.
// Старые версии не удаляются — лежат рядом, доступны через listRevisions().

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { prisma } from "./prisma";

const STORAGE_ROOT = (process.env.STORAGE_DIR || "/app/storage").replace(/\/+$/, "");

export type OwnerType = "incoming" | "document" | "visit_photo";

const SUBDIR: Record<OwnerType, string> = {
  incoming: "incoming",
  document: "outbox",
  visit_photo: "visits",
};

export interface SaveOptions {
  ownerType: OwnerType;
  ownerId: string;
  buffer: Buffer;
  filename: string;
  mime?: string;
  comment?: string;
  uploadedById?: string;
}

export interface SaveResult {
  /** Абсолютный путь, куда записан файл (для сохранения в owner-объект). */
  path: string;
  /** Путь относительно STORAGE_ROOT — для /api/files/download. */
  relPath: string;
  /** Номер созданной версии (1, 2, 3, …). */
  version: number;
}

export async function saveFileRevision(opts: SaveOptions): Promise<SaveResult> {
  const last = await prisma.fileRevision.findFirst({
    where: { ownerType: opts.ownerType, ownerId: opts.ownerId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version || 0) + 1;

  const subdir = SUBDIR[opts.ownerType];
  const safeName = opts.filename.replace(/[\\/:*?"<>|]/g, "_") || `file_${Date.now()}`;
  const relPath = `${subdir}/${opts.ownerId}/v${version}_${safeName}`;
  const fullPath = join(STORAGE_ROOT, relPath);

  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, opts.buffer);

  await prisma.fileRevision.create({
    data: {
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      version,
      path: fullPath,
      filename: opts.filename,
      size: opts.buffer.length,
      mime: opts.mime,
      uploadedById: opts.uploadedById,
      comment: opts.comment,
    },
  });

  return { path: fullPath, relPath, version };
}

export async function listRevisions(ownerType: string, ownerId: string) {
  return prisma.fileRevision.findMany({
    where: { ownerType, ownerId },
    orderBy: { version: "desc" },
  });
}

export async function getRevision(id: string) {
  return prisma.fileRevision.findUnique({ where: { id } });
}
