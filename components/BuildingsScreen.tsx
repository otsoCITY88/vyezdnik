"use client";

import { useState } from "react";
import { Pill } from "./Pill";
import { AddBuildingModal } from "./AddBuildingModal";
import { EditBuildingModal, BuildingEditView } from "./EditBuildingModal";

export interface BuildingView {
  id: string; fullAddress: string; subcontractorShort?: string | null;
  contractNumber?: string | null; cases: number;
  city: string; street: string; house: string; apartment?: string | null; porch?: string | null;
  subcontractorId?: string | null; contractId?: string | null;
}

interface Opt { id: string; label: string; subcontractorId?: string | null }

export function BuildingsScreen({
  buildings, subcontractors, contracts,
}: {
  buildings: BuildingView[]; subcontractors: Opt[]; contracts: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BuildingEditView | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? buildings.filter((b) => b.fullAddress.toLowerCase().includes(filter.toLowerCase())
        || b.subcontractorShort?.toLowerCase().includes(filter.toLowerCase()))
    : buildings;

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Справочник</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">МКД Мариуполя</h1>
          <p className="read mt-2 text-[16px] text-muted">
            {buildings.length} объектов · привязаны к договорам и СПО
          </p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>＋ Добавить объект</button>
      </div>

      <div className="ruler my-7" />

      <div className="flex items-center gap-3 mb-4">
        <input
          className="frame px-3 py-1.5 text-[13px]"
          placeholder="Фильтр по адресу или СПО…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ minWidth: 320, background: "var(--paper)", border: "1px solid var(--line)", outline: "none" }}
        />
        <span className="micro text-muted">{filtered.length} из {buildings.length}</span>
      </div>

      <div className="frame">
        <table className="editorial">
          <thead>
            <tr>
              <th>Адрес</th><th>СПО</th><th>Договор</th><th>Дел</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="flat">
                <td>{b.fullAddress}</td>
                <td>{b.subcontractorShort || "—"}</td>
                <td className="mono">{b.contractNumber ? `№ ${b.contractNumber}` : "—"}</td>
                <td>{b.cases > 0 ? <Pill tone="indigo">{b.cases}</Pill> : <span className="text-muted">—</span>}</td>
                <td><button className="btn ghost sm" onClick={() => setEdit({
                  id: b.id, city: b.city, street: b.street, house: b.house,
                  apartment: b.apartment, porch: b.porch,
                  subcontractorId: b.subcontractorId, contractId: b.contractId,
                })}>✎</button></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted p-8">ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <AddBuildingModal
          subcontractors={subcontractors}
          contracts={contracts}
          onClose={() => setOpen(false)}
        />
      )}
      {edit && (
        <EditBuildingModal
          building={edit}
          subcontractors={subcontractors}
          contracts={contracts}
          onClose={() => setEdit(null)}
        />
      )}
    </section>
  );
}
