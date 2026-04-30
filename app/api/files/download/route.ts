// Универсальный эндпоинт скачивания файлов из storage.
//
// Безопасность:
// 1) Только для залогиненных пользователей.
// 2) Whitelist префиксов внутри STORAGE_DIR — никаких системных путей.
// 3) Запрещены `..` и абсолютные пути — нельзя выйти за пределы whitelist.
//
// Использование:
//   GET /api/files/download?path=incoming/abc/v1_letter.pdf
//
// Путь — относительный от STORAGE_DIR. Лишние ведущие слэши и .. отсекаются.

import { NextResponse } from "next/server";
import { readFileSync, statSync } from "node:fs";
import { join, normalize, basename, extname } from "node:path";
import { auth } from "@/auth";

const STORAGE_ROOT = process.env.STORAGE_DIR || "/app/storage";

const ALLOWED_PREFIXES = [
  "incoming/",
  "outbox/",
  "visits/",
  "signatures/",
  "edo/",
];

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".zip": "application/zip",
  ".sig": "application/pkcs7-signature",
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rel = (searchParams.get("path") || "").trim();
  if (!rel) {
    return NextResponse.json({ error: "path_required" }, { status: 400 });
  }

  // Нормализуем: убираем ведущие слэши, разворачиваем .., проверяем whitelist.
  const norm = normalize(rel).replace(/^[/\\]+/, "");
  if (norm.includes("..") || !ALLOWED_PREFIXES.some((p) => norm.startsWith(p))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const fullPath = join(STORAGE_ROOT, norm);
  let buf: Buffer;
  try {
    statSync(fullPath);
    buf = readFileSync(fullPath);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ext = extname(fullPath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const filename = basename(fullPath);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
    },
  });
}
