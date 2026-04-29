"use client";

import Link from "next/link";
import { CaseRow } from "@/lib/queries";
import { Pill, PillTone } from "./Pill";
import { dateShort, relativeDay } from "@/lib/format";

export function CaseRowsTable({ rows, showIncoming = true }: { rows: CaseRow[]; showIncoming?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="p-10 text-center text-muted">
        <div className="display text-[20px]">Ничего не найдено</div>
        <div className="text-[13px] mt-2">Сбросьте фильтры или создайте новое дело</div>
      </div>
    );
  }
  return (
    <table className="editorial">
      <thead>
        <tr>
          <th>№</th>
          <th>Объект · заявитель</th>
          <th>СПО</th>
          <th>Состояние</th>
          {showIncoming && <th>Входящее</th>}
          <th>Дедлайн</th>
          <th>Ответств.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Row key={r.id} r={r} showIncoming={showIncoming} />
        ))}
      </tbody>
    </table>
  );
}

function Row({ r, showIncoming }: { r: CaseRow; showIncoming: boolean }) {
  const deadlineCls = r.nearestDeadline?.days != null
    ? r.nearestDeadline.days < 0
      ? "text-bordeaux"
      : r.nearestDeadline.days <= 1
        ? "text-amber"
        : ""
    : "text-muted";

  return (
    <tr onClick={() => (window.location.href = `/cases/${r.id}`)}>
      <td className="mono whitespace-nowrap">{r.caseNumber}</td>
      <td>
        <div>{r.buildingShort}</div>
        <div className="micro-2 text-muted mt-1">{r.applicant}</div>
      </td>
      <td>{r.spoShort}</td>
      <td>
        <Pill tone={r.stateTone as PillTone}>{r.stateLabel}</Pill>
      </td>
      {showIncoming && (
        <td className="mono whitespace-nowrap">{r.incomingNumber || "—"}</td>
      )}
      <td className={`mono whitespace-nowrap ${deadlineCls}`}>
        {r.nearestDeadline ? `${dateShort(r.nearestDeadline.iso)} · ${relativeDay(r.nearestDeadline.iso)}` : "—"}
      </td>
      <td>
        <Link
          href={`/cases/${r.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
        >
          {r.responsibleShort}
        </Link>
      </td>
    </tr>
  );
}
