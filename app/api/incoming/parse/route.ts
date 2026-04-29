import { NextRequest, NextResponse } from "next/server";
import { extractFromPdf } from "@/lib/pdf-extract";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  try {
    const buf = await file.arrayBuffer();
    const result = await extractFromPdf(buf);
    // отправляем без full text (он может быть огромным)
    const { text, ...rest } = result;
    return NextResponse.json({
      ok: true,
      extracted: rest,
      preview: text.slice(0, 1500),
    });
  } catch (e: unknown) {
    return NextResponse.json({
      error: "parse_failed",
      message: e instanceof Error ? e.message : "Не удалось извлечь текст. Возможно, скан без OCR.",
    }, { status: 422 });
  }
}
