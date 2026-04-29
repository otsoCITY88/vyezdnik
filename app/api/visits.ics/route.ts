import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET() {
  const visits = await prisma.visit.findMany({
    include: { case: { include: { building: true, subcontractor: true } } },
  });
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RKS-NR//Vyezd//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Выезды РКС·Выезд",
  ];
  for (const v of visits) {
    const start = v.visitDate;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:visit-${v.id}@rks-nr.local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${v.case.building.shortAddress} · ${v.case.subcontractor.shortName}`,
      `DESCRIPTION:Дело ${v.case.caseNumber} · тип: ${v.kind}${v.findings ? `\\n${v.findings.replace(/\n/g, "\\n")}` : ""}`,
      `LOCATION:${v.case.building.fullAddress}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rks-vyezd-visits.ics"`,
    },
  });
}
