"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface CaseOpt { id: string; caseNumber: string; address: string; spo: string }

export function AttachIncomingModal({
  incomingNumber, incomingId, cases, onClose,
}: {
  incomingNumber: string; incomingId: string;
  cases: CaseOpt[]; onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? cases.filter((c) =>
        c.caseNumber.toLowerCase().includes(filter.toLowerCase()) ||
        c.address.toLowerCase().includes(filter.toLowerCase()) ||
        c.spo.toLowerCase().includes(filter.toLowerCase()),
      )
    : cases;

  async function attach() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/incoming/${incomingId}/attach-case`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selected }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Ошибка ${r.status}`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`Привязать ${incomingNumber} к делу`}
      subtitle="Выберите дело, к которому относится это входящее"
      onClose={onClose}
      width={760}
      footer={
        <>
          <div className="micro text-muted">{filtered.length} из {cases.length} дел</div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={attach} disabled={busy || !selected}>
            {busy ? "…" : "Привязать"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="field">
          <label>Поиск</label>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="по номеру дела, адресу, СПО…" />
        </div>

        <div className="frame max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-muted text-center">ничего не найдено</div>
          ) : filtered.map((c) => (
            <label
              key={c.id}
              className={`flex items-center gap-3 p-3 cursor-pointer border-b ${selected === c.id ? "" : ""}`}
              style={{
                borderColor: "var(--line-soft)",
                background: selected === c.id ? "var(--paper-2)" : "transparent",
              }}
            >
              <input type="radio" name="case" checked={selected === c.id} onChange={() => setSelected(c.id)} />
              <div className="flex-1 min-w-0">
                <div className="mono text-[12.5px]">{c.caseNumber}</div>
                <div className="text-[13px]">{c.address}</div>
              </div>
              <div className="text-[12.5px] text-muted">{c.spo}</div>
            </label>
          ))}
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
