import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { autoDraftBlock, isAiConfigured } from "@/lib/ai";

const Body = z.object({
  templateKind: z.string(),
  caseContext: z.string().min(5),
  goal: z.string().min(5),
  contractClauses: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  try {
    const text = await autoDraftBlock(parsed.data);
    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    return NextResponse.json({
      error: "ai_failed",
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
