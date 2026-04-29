"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function SpoResponseModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    responseNumber: "",
    responseDate: new Date().toISOString().slice(0, 10),
    resolution: "promised",
    notes: "",
  });

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/cases/${caseId}/spo-response`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!r.ok) throw new Error(`Ошибка ${r.status}`);
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Ответ от СПО"
      subtitle="Зафиксировать письмо/реакцию подрядчика"
      onClose={onClose}
      width={620}
      footer={
        <>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Дата ответа</label>
            <input type="date" value={f.responseDate} onChange={(e) => setF((s) => ({ ...s, responseDate: e.target.value }))} />
          </div>
          <div className="field">
            <label>Исх. № СПО</label>
            <input value={f.responseNumber} onChange={(e) => setF((s) => ({ ...s, responseNumber: e.target.value }))} className="mono" placeholder="напр. 38-ССУ15" />
          </div>
        </div>

        <div className="field">
          <label>Решение СПО</label>
          <div className="grid gap-2">
            {[
              { k: "accepted", label: "Принял замечания, приступает к работам" },
              { k: "promised", label: "Предоставил график устранения" },
              { k: "refused", label: "Отказ / уклонение" },
            ].map((x) => (
              <label key={x.k} className={`frame p-3 cursor-pointer ${f.resolution === x.k ? "border-2" : ""}`} style={f.resolution === x.k ? { borderColor: "var(--ink)" } : {}}>
                <input type="radio" className="hidden" name="res" checked={f.resolution === x.k} onChange={() => setF((s) => ({ ...s, resolution: x.k }))} />
                <span className="text-[13px]">{x.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Комментарий</label>
          <textarea rows={3} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} placeholder="напр. График приложен, срок 14 рабочих дней" />
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
