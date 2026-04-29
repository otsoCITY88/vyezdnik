"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "./Pill";
import { AddVisitModal, PlannedVisit } from "./AddVisitModal";

export interface VisitView {
  id: string;
  visitDate: string;        // ISO
  kind: "initial" | "repeat" | "final";
  status: "planned" | "done" | "cancelled";
  result?: string | null;
  findings?: string | null;
  members?: Array<{ role: string; name: string }>;
  photos?: number;
}

export function CaseVisitsBlock({ caseId, visits }: { caseId: string; visits: VisitView[] }) {
  const router = useRouter();
  const [recordOf, setRecordOf] = useState<PlannedVisit | null>(null);

  const planned = visits.filter((v) => v.status === "planned").sort((a, b) => a.visitDate.localeCompare(b.visitDate));
  const done    = visits.filter((v) => v.status === "done").sort((a, b) => b.visitDate.localeCompare(a.visitDate));

  if (visits.length === 0) return null;

  async function cancelPlanned(id: string) {
    if (!confirm("Отменить запланированный выезд?")) return;
    const r = await fetch(`/api/cases/${caseId}/visits/${id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
  }

  return (
    <div className="frame mt-6 p-5">
      <div className="micro text-muted">Выезды</div>
      <div className="ruler my-4" />

      {planned.length > 0 && (
        <>
          <div className="micro-2 text-muted mb-2">🗓 Запланировано ({planned.length})</div>
          <ul className="text-[13px] space-y-3 mb-4">
            {planned.map((v) => (
              <li key={v.id} className="frame p-3" style={{ borderStyle: "dashed" }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="mono text-[12px] text-muted">{formatDate(v.visitDate)} · {relative(v.visitDate)}</div>
                    <div>{kindLabel(v.kind)} выезд</div>
                    {v.findings && <div className="micro-2 text-muted mt-1">{v.findings}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Pill tone="amber">запланирован</Pill>
                    <button
                      className="btn bordeaux sm text-[11px]"
                      onClick={() => setRecordOf({
                        id: v.id, visitDate: v.visitDate, kind: v.kind,
                        members: v.members, notes: v.findings || null,
                      })}
                    >
                      ✓ Зафиксировать
                    </button>
                    <button
                      className="text-bordeaux text-[11px] hover:underline"
                      onClick={() => cancelPlanned(v.id)}
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="micro-2 text-muted mb-2">✓ Состоявшиеся ({done.length})</div>
          <ul className="text-[13px] space-y-3">
            {done.map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <div>
                  <div className="mono text-[12px] text-muted">{formatDate(v.visitDate)}</div>
                  <div>{kindLabel(v.kind)}{v.photos ? ` · ${v.photos} фото` : ""}</div>
                  {v.findings && <div className="micro-2 text-muted mt-1 line-clamp-2">{v.findings}</div>}
                </div>
                <Pill tone={v.result === "resolved" ? "moss" : v.result === "defects_found" ? "bordeaux" : v.result === "partially_resolved" ? "amber" : "neutral"}>
                  {resultLabel(v.result)}
                </Pill>
              </li>
            ))}
          </ul>
        </>
      )}

      {recordOf && (
        <AddVisitModal
          caseId={caseId}
          fromPlanned={recordOf}
          onClose={() => setRecordOf(null)}
        />
      )}
    </div>
  );
}

function kindLabel(k: string) {
  return ({ initial: "Первичный", repeat: "Повторный", final: "Финальный" } as Record<string, string>)[k] || k;
}
function resultLabel(r?: string | null) {
  return r ? ({ resolved: "устранены", defects_found: "дефекты", partially_resolved: "частично" } as Record<string, string>)[r] || r : "—";
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function relative(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  if (days === -1) return "вчера";
  if (days > 0) return `через ${days} д.`;
  return `${Math.abs(days)} д. назад`;
}
