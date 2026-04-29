"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface Opt { id: string; label: string; subcontractorId?: string | null }

export interface BuildingEditView {
  id: string; city: string; street: string; house: string;
  apartment?: string | null; porch?: string | null;
  subcontractorId?: string | null; contractId?: string | null;
}

export function EditBuildingModal({
  building, subcontractors, contracts, onClose,
}: {
  building: BuildingEditView;
  subcontractors: Opt[];
  contracts: Opt[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askDel, setAskDel] = useState(false);
  const [f, setF] = useState({
    city: building.city,
    street: building.street, house: building.house,
    apartment: building.apartment || "",
    porch: building.porch || "",
    subcontractorId: building.subcontractorId || "",
    contractId: building.contractId || "",
  });

  const filteredContracts = useMemo(
    () => contracts.filter((c) => !f.subcontractorId || c.subcontractorId === f.subcontractorId),
    [contracts, f.subcontractorId],
  );

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/buildings/${building.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function del() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/buildings/${building.id}`, { method: "DELETE" });
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
      title={`Редактирование МКД`}
      subtitle={`${building.street}, д. ${building.house}${building.apartment ? `, кв. ${building.apartment}` : ""}`}
      onClose={onClose}
      width={680}
      footer={
        <>
          {askDel ? (
            <>
              <span className="text-bordeaux text-[13px]">Точно удалить адрес?</span>
              <div className="flex-1" />
              <button className="btn ghost" onClick={() => setAskDel(false)} disabled={busy}>Отмена</button>
              <button className="btn bordeaux" onClick={del} disabled={busy}>Удалить</button>
            </>
          ) : (
            <>
              <button className="btn ghost" style={{ color: "var(--bordeaux)" }} onClick={() => setAskDel(true)}>Удалить</button>
              <div className="flex-1" />
              <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
              <button className="btn bordeaux" onClick={save} disabled={busy || !f.street || !f.house}>
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </>
          )}
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
            <input value={f.street} onChange={(e) => set("street", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="field"><label>Дом *</label><input value={f.house} onChange={(e) => set("house", e.target.value)} /></div>
          <div className="field"><label>Квартира</label><input value={f.apartment} onChange={(e) => set("apartment", e.target.value)} /></div>
          <div className="field"><label>Подъезд</label><input value={f.porch} onChange={(e) => set("porch", e.target.value)} /></div>
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
              <option value="">— по умолчанию —</option>
              {filteredContracts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
