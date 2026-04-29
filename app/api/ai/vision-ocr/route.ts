import { NextRequest, NextResponse } from "next/server";
import { visionExtract, isAiConfigured } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured", message: "Установите ANTHROPIC_API_KEY в .env" }, { status: 503 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const fields = await visionExtract(buf);
    return NextResponse.json({ ok: true, extracted: fields });
  } catch (e: unknown) {
    return NextResponse.json({
      error: "ai_failed",
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
