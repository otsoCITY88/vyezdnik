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

import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { Prisma } from "@prisma/client";
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

/**
 * Сохраняет версию файла идемпотентно к гонке записи.
 *
 * Проблема: при двух одновременных загрузках оба процесса могут прочитать
 * одинаковый max version и попытаться вставить новую запись с тем же
 * номером — упадёт unique constraint @@unique([ownerType, ownerId, version]).
 *
 * Решение: ретрай до 5 раз при коде P2002 (unique violation). Перед каждым
 * ретраем перезапрашиваем max version. Если файл уже записан на диск с
 * "проигравшим" путём — удаляем, чтобы не было сирот.
 */
export async function saveFileRevision(opts: SaveOptions): Promise<SaveResult> {
  const subdir = SUBDIR[opts.ownerType];
  const safeName = opts.filename.replace(/[\\/:*?"<>|]/g, "_") || `file_${Date.now()}`;
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await prisma.fileRevision.findFirst({
      where: { ownerType: opts.ownerType, ownerId: opts.ownerId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (last?.version || 0) + 1;

    const relPath = `${subdir}/${opts.ownerId}/v${version}_${safeName}`;
    const fullPath = join(STORAGE_ROOT, relPath);

    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, opts.buffer);

    try {
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
    } catch (e) {
      // P2002 = unique constraint violation = другой запрос уже вставил
      // запись с тем же version. Удаляем "проигравший" файл и пробуем снова.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        try { unlinkSync(fullPath); } catch { /* файл уже мог быть удалён */ }
        continue;
      }
      throw e;
    }
  }

  throw new Error(
    `saveFileRevision: не удалось вставить версию после ${MAX_RETRIES} попыток (гонка)`,
  );
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
