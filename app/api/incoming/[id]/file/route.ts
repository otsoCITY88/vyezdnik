import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const inc = await prisma.incomingLetter.findUnique({ where: { id } });
  if (!inc?.attachedFile) {
    return NextResponse.json({ error: "no_file", message: "К этому входящему файл не приложен" }, { status: 404 });
  }
  let buf: Buffer;
  try { buf = readFileSync(inc.attachedFile); }
  catch { return NextResponse.json({ error: "file_missing", message: "Файл удалён с диска" }, { status: 404 }); }

  const ext = extname(inc.attachedFile).toLowerCase();
  const mime = ext === ".pdf" ? "application/pdf"
            : ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream";

  // если ?download=1 — отдаём как attachment, иначе inline (для просмотра в браузере)
  const isDownload = new URL(req.url).searchParams.get("download") === "1";
  const filename = `${inc.number.replace(/[\\/:*?"<>|]/g, "_")}_${basename(inc.attachedFile)}`;

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
