import { NextResponse } from "next/server";
import { listCases } from "@/lib/queries";
import { dateShort } from "@/lib/format";

function escape(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const rows = await listCases();
  const headers = [
    "Дело №", "Состояние", "Объект", "Заявитель", "СПО",
    "Входящее", "Дедлайн", "Дней до дедлайна", "Ответственный",
  ];
  const csv: string[] = [headers.join(";")];

  for (const r of rows) {
    csv.push([
      escape(r.caseNumber),
      escape(r.stateLabel),
      escape(r.buildingFull),
      escape(r.applicant),
      escape(r.spoShort),
      escape(r.incomingNumber || ""),
      escape(r.nearestDeadline ? dateShort(r.nearestDeadline.iso) : ""),
      escape(r.nearestDeadline?.days ?? ""),
      escape(r.responsibleShort),
    ].join(";"));
  }

  // BOM + ; разделитель — чтобы Excel в России сразу открывал нормально
  const body = "﻿" + csv.join("\n");
  const filename = `cases_${dateShort(new Date()).replace(/\./g, "-")}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
