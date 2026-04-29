"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function CloseCaseModal({ caseId, isOpen, onClose }: { caseId: string; isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"resolved" | "withdrawn_volumes" | "litigation">("resolved");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/cases/${caseId}/close`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note }),
      });
      if (!r.ok) throw new Error(`Ошибка ${r.status}`);
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function reopen() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/cases/${caseId}/close`, { method: "DELETE" });
      if (!r.ok) throw new Error(`Ошибка ${r.status}`);
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Закрыть дело"
      subtitle="Финальный исход — повлияет на статистику и фильтры"
      onClose={onClose}
      width={580}
      footer={
        <>
          <button className="btn ghost" onClick={reopen} disabled={busy}>Возобновить (отменить закрытие)</button>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy}>
            {busy ? "Закрываем…" : "Закрыть дело"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="field">
          <label>Исход</label>
          <div className="grid gap-2">
            {[
              { k: "resolved", label: "Замечания устранены, инцидент закрыт" },
              { k: "withdrawn_volumes", label: "Объёмы работ изъяты у СПО" },
              { k: "litigation", label: "Передано в арбитраж" },
            ].map((x) => (
              <label key={x.k} className={`frame p-3 cursor-pointer ${outcome === x.k ? "border-2" : ""}`} style={outcome === x.k ? { borderColor: "var(--ink)" } : {}}>
                <input type="radio" className="hidden" name="oc" checked={outcome === x.k} onChange={() => setOutcome(x.k as typeof outcome)} />
                <span className="text-[13px]">{x.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Комментарий</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
