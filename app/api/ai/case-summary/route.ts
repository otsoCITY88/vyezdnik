import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseSummary, isAiConfigured } from "@/lib/ai";
import { dateShort, safeJSON } from "@/lib/format";
import { STATE_LABELS } from "@/lib/workflow";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }
  const { caseId } = await req.json();
  if (!caseId) return NextResponse.json({ error: "no_case_id" }, { status: 400 });

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      building: true, subcontractor: true,
      events: { orderBy: { occurredAt: "asc" } },
      incomingLetter: true,
    },
  });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const summary = await caseSummary({
      caseNumber: c.caseNumber,
      building: c.building.fullAddress,
      spo: c.subcontractor.shortName,
      state: STATE_LABELS[c.state as keyof typeof STATE_LABELS] || c.state,
      applicant: c.incomingLetter?.applicantName || undefined,
      events: c.events.map((e) => ({
        date: dateShort(e.occurredAt),
        kind: e.kind,
        title: e.title,
        description: e.description || undefined,
      })),
      deadlines: safeJSON<Record<string, string>>(c.deadlines, {}),
    });

    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    return NextResponse.json({
      error: "ai_failed",
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

