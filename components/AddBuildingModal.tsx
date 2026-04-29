"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface Opt { id: string; label: string; subcontractorId?: string | null }

export function AddBuildingModal({
  subcontractors, contracts, onClose, onCreated,
}: {
  subcontractors: Opt[];
  contracts: Opt[];
  onClose: () => void;
  onCreated?: (id: string, label: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    city: "Мариуполь",
    street: "", house: "", apartment: "", porch: "",
    subcontractorId: subcontractors[0]?.id || "",
    contractId: "",
  });

  const filteredContracts = useMemo(
    () => contracts.filter((c) => !f.subcontractorId || c.subcontractorId === f.subcontractorId),
    [contracts, f.subcontractorId],
  );

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/buildings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, contractId: f.contractId || filteredContracts[0]?.id || "" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.issues?.[0]?.message || `Ошибка ${r.status}`);
      }
      const j = await r.json();
      const label = `г. ${f.city}, ${f.street}, д. ${f.house}${f.apartment ? `, кв. ${f.apartment}` : ""}`;
      onCreated?.(j.id, label);
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Добавить МКД"
      subtitle="Адрес в Мариуполе с привязкой к субподрядчику"
      onClose={onClose}
      width={680}
      footer={
        <>
          <div className="micro text-muted">Минимум: улица и дом</div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy || !f.street || !f.house}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="field">
            <label>Город</label>
            <input value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label>Улица *</label>
            <input value={f.street} onChange={(e) => set("street", e.target.value)} placeholder="напр. пр. Металлургов" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="field">
            <label>Дом *</label>
            <input value={f.house} onChange={(e) => set("house", e.target.value)} placeholder="45/9" />
          </div>
          <div className="field">
            <label>Квартира</label>
            <input value={f.apartment} onChange={(e) => set("apartment", e.target.value)} placeholder="63" />
          </div>
          <div className="field">
            <label>Подъезд</label>
            <input value={f.porch} onChange={(e) => set("porch", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Субподрядчик (СПО)</label>
            <select value={f.subcontractorId} onChange={(e) => set("subcontractorId", e.target.value)}>
              <option value="">— не привязан —</option>
              {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Договор</label>
            <select value={f.contractId} onChange={(e) => set("contractId", e.target.value)}>
              <option value="">— по умолчанию для СПО —</option>
              {filteredContracts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
