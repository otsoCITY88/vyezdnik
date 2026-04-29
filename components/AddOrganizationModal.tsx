"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

const KINDS: Array<{ key: string; label: string }> = [
  { key: "subcontractor", label: "Субподрядчик (СПО)" },
  { key: "customer", label: "Заказчик · ППК" },
  { key: "administration", label: "Администрация" },
  { key: "prosecutor", label: "Прокуратура" },
  { key: "fund", label: "Фонд / эксплуатация" },
  { key: "balance_holder", label: "Балансодержатель" },
  { key: "ours", label: "Мы (РКС-НР)" },
  { key: "other", label: "Прочее" },
];

export function AddOrganizationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    kind: "subcontractor",
    shortName: "", fullName: "",
    inn: "", kpp: "", ogrn: "",
    legalAddress: "", defaultEmail: "",
    notes: "",
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.issues?.[0]?.message || `Ошибка ${r.status}`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Добавить контрагента"
      subtitle="ППК, СПО, администрация, прокуратура и др."
      onClose={onClose}
      width={760}
      footer={
        <>
          <div className="micro text-muted">Обязательные поля: тип, краткое и полное наименование</div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy || !f.shortName || !f.fullName}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="field">
          <label>Тип</label>
          <select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Краткое наименование *</label>
            <input value={f.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="напр. АО «РКК»" />
          </div>
          <div className="field">
            <label>E-mail для связи</label>
            <input value={f.defaultEmail} onChange={(e) => set("defaultEmail", e.target.value)} placeholder="info@..." />
          </div>
        </div>

        <div className="field">
          <label>Полное наименование *</label>
          <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="АО «Республиканская коммунальная компания»" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="field">
            <label>ИНН</label>
            <input value={f.inn} onChange={(e) => set("inn", e.target.value)} className="mono" />
          </div>
          <div className="field">
            <label>КПП</label>
            <input value={f.kpp} onChange={(e) => set("kpp", e.target.value)} className="mono" />
          </div>
          <div className="field">
            <label>ОГРН</label>
            <input value={f.ogrn} onChange={(e) => set("ogrn", e.target.value)} className="mono" />
          </div>
        </div>

        <div className="field">
          <label>Юридический адрес</label>
          <input value={f.legalAddress} onChange={(e) => set("legalAddress", e.target.value)} />
        </div>

        <div className="field">
          <label>Заметки</label>
          <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
