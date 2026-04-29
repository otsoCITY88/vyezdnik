import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const visits = await prisma.visit.findMany({
    where: {
      ...(from && to ? { visitDate: { gte: new Date(from), lte: new Date(to) } } : {}),
    },
    include: {
      case: { include: { building: true, subcontractor: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  // Для FullCalendar
  return NextResponse.json(visits.map((v) => {
    const isPlanned = v.status === "planned";
    const baseColor =
      v.result === "resolved" ? "#4E5C39"
      : v.result === "defects_found" ? "#6B1F2A"
      : v.result === "partially_resolved" ? "#B26314"
      : v.kind === "initial" ? "#1F2A6B"
      : v.kind === "repeat" ? "#B26314"
      : "#2B313B";
    return {
      id: v.id,
      title: `${isPlanned ? "🗓 " : ""}${v.case.building.shortAddress} · ${v.case.subcontractor.shortName}`,
      start: v.visitDate.toISOString(),
      end: new Date(v.visitDate.getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      backgroundColor: isPlanned ? "transparent" : baseColor,
      borderColor: baseColor,
      textColor: isPlanned ? baseColor : "#FFFFFF",
      classNames: isPlanned ? ["fc-event-planned"] : ["fc-event-done"],
      extendedProps: {
        caseId: v.caseId,
        caseNumber: v.case.caseNumber,
        kind: v.kind,
        status: v.status,
        result: v.result,
        findings: v.findings,
      },
    };
  }));
}

const PatchBody = z.object({ visitDate: z.string() });

export async function PATCH(req: NextRequest) {
  // переносим выезд (drag-n-drop)
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "no_id" }, { status: 400 });
  const json = await req.json();
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  await prisma.visit.update({
    where: { id },
    data: { visitDate: new Date(parsed.data.visitDate) },
  });
  return NextResponse.json({ ok: true });
}
