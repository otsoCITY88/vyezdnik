"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Pill } from "./Pill";

export interface ContractView {
  id: string; number: string; dateISO: string; dateShort: string;
  subcontractorId: string; subcontractorShort: string;
  clauses: { warranty: string[]; remedy: string[]; responsibility: string[]; info_request: string[]; penalty: string[] };
  penaltyAmountRub?: number | null;
  buildings: number; cases: number;
}

interface Opt { id: string; label: string }

export function ContractsScreen({ contracts, subcontractors }: { contracts: ContractView[]; subcontractors: Opt[] }) {
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<ContractView | null>(null);
  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Справочник</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Договоры</h1>
          <p className="read mt-2 text-[16px] text-muted">{contracts.length} договоров субподряда с привязанными пунктами</p>
        </div>
        <button className="btn" onClick={() => setAdd(true)}>＋ Добавить договор</button>
      </div>
      <div className="ruler my-7" />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {contracts.map((c) => (
          <div key={c.id} className="frame p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="display text-[20px]">№ {c.number}</div>
                <div className="text-[13px] text-muted mt-0.5">от {c.dateShort} · {c.subcontractorShort}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.cases > 0 && <Pill tone="indigo">{c.cases} дел</Pill>}
                {c.buildings > 0 && <Pill>{c.buildings} МКД</Pill>}
                <button className="btn ghost sm" onClick={() => setEdit(c)}>✎</button>
              </div>
            </div>
            <div className="ruler my-3" />
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <Field label="Гарантии" value={c.clauses.warranty.join(", ") || "—"} />
              <Field label="Устранение" value={c.clauses.remedy.join(", ") || "—"} />
              <Field label="Ответственность" value={c.clauses.responsibility.join(", ") || "—"} />
              <Field label="Запрос информации" value={c.clauses.info_request.join(", ") || "—"} />
              <Field label="Штраф (пункт)" value={c.clauses.penalty.join(", ") || "—"} />
              <Field label="Штраф (сумма)" value={c.penaltyAmountRub ? `${c.penaltyAmountRub.toLocaleString("ru-RU")} ₽` : "—"} />
            </div>
          </div>
        ))}
      </div>

      {add && <ContractFormModal subcontractors={subcontractors} onClose={() => setAdd(false)} />}
      {edit && <ContractFormModal subcontractors={subcontractors} contract={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="micro-2 text-muted">{label}</div>
      <div className="mono mt-0.5">{value}</div>
    </div>
  );
}

function ContractFormModal({
  contract, subcontractors, onClose,
}: { contract?: ContractView; subcontractors: Opt[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askDel, setAskDel] = useState(false);
  const [f, setF] = useState({
    number: contract?.number || "",
    date: contract?.dateISO || new Date().toISOString().slice(0, 10),
    subcontractorId: contract?.subcontractorId || subcontractors[0]?.id || "",
    warranty: contract?.clauses.warranty.join(", ") || "7.20, 7.21",
    remedy: contract?.clauses.remedy.join(", ") || "8.10",
    responsibility: contract?.clauses.responsibility.join(", ") || "4.1.21",
    info_request: contract?.clauses.info_request.join(", ") || "4.1.9",
    penalty: contract?.clauses.penalty.join(", ") || "8.17",
    penaltyAmountRub: contract?.penaltyAmountRub ?? 150000,
  });

  function arr(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const body = {
        number: f.number, date: f.date, subcontractorId: f.subcontractorId,
        warranty: arr(f.warranty),
        remedy: arr(f.remedy),
        responsibility: arr(f.responsibility),
        info_request: arr(f.info_request),
        penalty: arr(f.penalty),
        penaltyAmountRub: Number(f.penaltyAmountRub) || null,
      };
      const r = await fetch(contract ? `/api/contracts/${contract.id}` : "/api/contracts", {
        method: contract ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || j.issues?.[0]?.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function del() {
    if (!contract) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      setAskDel(false);
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title={contract ? `Договор № ${contract.number}` : "Новый договор"}
      subtitle="Пункты используются в шаблонах писем (T6, T7, T8)"
      onClose={onClose}
      width={680}
      footer={
        contract && askDel ? (
          <>
            <span className="text-bordeaux text-[13px]">Удалить договор?</span>
            <div className="flex-1" />
            <button className="btn ghost" onClick={() => setAskDel(false)} disabled={busy}>Отмена</button>
            <button className="btn bordeaux" onClick={del} disabled={busy}>Удалить</button>
          </>
        ) : (
          <>
            {contract && <button className="btn ghost" style={{ color: "var(--bordeaux)" }} onClick={() => setAskDel(true)}>Удалить</button>}
            <div className="flex-1" />
            <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
            <button className="btn bordeaux" onClick={save} disabled={busy || !f.number || !f.date || !f.subcontractorId}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </>
        )
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="field"><label>Номер *</label><input className="mono" value={f.number} onChange={(e) => setF((s) => ({ ...s, number: e.target.value }))} /></div>
          <div className="field"><label>Дата *</label><input type="date" value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} /></div>
          <div className="field"><label>СПО *</label>
            <select value={f.subcontractorId} onChange={(e) => setF((s) => ({ ...s, subcontractorId: e.target.value }))}>
              {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="micro text-muted">Пункты договора (через запятую)</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field"><label>Гарантийные обязательства</label><input className="mono" value={f.warranty} onChange={(e) => setF((s) => ({ ...s, warranty: e.target.value }))} placeholder="7.20, 7.21" /></div>
          <div className="field"><label>Порядок устранения</label><input className="mono" value={f.remedy} onChange={(e) => setF((s) => ({ ...s, remedy: e.target.value }))} placeholder="8.10" /></div>
          <div className="field"><label>Ответственность</label><input className="mono" value={f.responsibility} onChange={(e) => setF((s) => ({ ...s, responsibility: e.target.value }))} placeholder="4.1.21" /></div>
          <div className="field"><label>Предоставление информации</label><input className="mono" value={f.info_request} onChange={(e) => setF((s) => ({ ...s, info_request: e.target.value }))} placeholder="4.1.9" /></div>
          <div className="field"><label>Штраф (пункт)</label><input className="mono" value={f.penalty} onChange={(e) => setF((s) => ({ ...s, penalty: e.target.value }))} placeholder="8.17" /></div>
          <div className="field"><label>Штраф (сумма, ₽)</label><input type="number" min={0} value={f.penaltyAmountRub} onChange={(e) => setF((s) => ({ ...s, penaltyAmountRub: Number(e.target.value) }))} /></div>
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
