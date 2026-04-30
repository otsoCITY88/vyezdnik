// ZIP-выгрузка всех файлов дела одним архивом.
//
// Структура ZIP:
//   <caseNumber>/
//     incoming/<file>
//     documents/<file>
//     signatures/<file>
//     edo/<file>
//     visits/<file>
//
// Не стримим — собираем в памяти. Для типичного дела (~10-30 МБ) это
// нормально; для очень больших — можно потом перейти на стриминг.

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import JSZip from "jszip";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { caseFiles, type CaseFile } from "@/lib/queries";

const STORAGE_ROOT = (process.env.STORAGE_DIR || "/app/storage").replace(/\/+$/, "");

const SUBDIR: Record<CaseFile["kind"], string> = {
  incoming: "incoming",
  document: "documents",
  signature: "signatures",
  edo: "edo",
  visit_photo: "visits",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const c = await prisma.case.findUnique({
    where: { id },
    select: { caseNumber: true },
  });
  if (!c) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const files = await caseFiles(id);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 404 });
  }

  const zip = new JSZip();
  const safeCase = c.caseNumber.replace(/[\\/:*?"<>|]/g, "_");
  let added = 0;

  for (const f of files) {
    const fullPath = `${STORAGE_ROOT}/${f.relPath}`;
    if (!existsSync(fullPath)) continue;
    try {
      const buf = readFileSync(fullPath);
      const subdir = SUBDIR[f.kind];
      const name = basename(fullPath);
      zip.file(`${safeCase}/${subdir}/${name}`, buf);
      added++;
    } catch {
      // молча пропускаем нечитаемые файлы — не валим весь архив
    }
  }

  if (added === 0) {
    return NextResponse.json({ error: "no_readable_files" }, { status: 404 });
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeCase)}_files.zip`,
      "Content-Length": String(buf.length),
    },
  });
}
