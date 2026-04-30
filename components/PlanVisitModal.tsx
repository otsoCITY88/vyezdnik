"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

const KINDS = [
  { key: "initial", label: "Первичный" },
  { key: "repeat", label: "Повторный" },
  { key: "final", label: "Финальный" },
];

export function PlanVisitModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    visitDate: tomorrow(),
    kind: "repeat" as "initial" | "repeat" | "final",
    notes: "",
    // Состав комиссии заполняется из реальных пользователей системы (см. useEffect),
    // не хардкодим конкретные ФИО.
    members: [] as Array<{ role: string; name: string }>,
  });
  const [newMember, setNewMember] = useState({ role: "spo", name: "" });

  // Подтягиваем сотрудников РКС-НР и сразу добавляем их в состав комиссии как
  // удобный дефолт. Пользователь может убрать любого крестиком и добавить других.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((users: Array<{ shortName?: string | null; fullName: string }>) => {
        if (cancelled || !Array.isArray(users) || users.length === 0) return;
        setF((s) => (s.members.length > 0 ? s : {
          ...s,
          members: users.slice(0, 2).map((u) => ({
            role: "rks",
            name: u.shortName || u.fullName,
          })),
        }));
      })
      .catch(() => { /* пусто — пользователь сам наберёт состав */ });
    return () => { cancelled = true; };
  }, []);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/cases/${caseId}/visits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "plan", ...f }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || j.error || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Запланировать выезд"
      subtitle="Дата + состав комиссии. Итог и фото добавите при фиксации."
      onClose={onClose}
      width={620}
      footer={
        <>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy || !f.visitDate}>
            {busy ? "Сохраняем…" : "Запланировать"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Дата</label>
            <input type="date" value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} />
          </div>
          <div className="field">
            <label>Тип</label>
            <select value={f.kind} onChange={(e) => set("kind", e.target.value as "initial" | "repeat" | "final")}>
              {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Состав комиссии</label>
          <div className="frame p-3 grid gap-2">
            {f.members.map((m, i) => (
              <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr auto" }}>
                <span className="pill">{labelOfRole(m.role)}</span>
                <span>{m.name}</span>
                <button className="btn ghost sm" onClick={() => set("members", f.members.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <div className="grid items-center gap-2 pt-2 border-t" style={{ gridTemplateColumns: "120px 1fr auto", borderColor: "var(--line-soft)" }}>
              <select value={newMember.role} onChange={(e) => setNewMember((x) => ({ ...x, role: e.target.value }))}>
                <option value="spo">СПО</option>
                <option value="rks">РКС-НР</option>
                <option value="ppk">ППК ЕЗ</option>
                <option value="adm">Администрация</option>
                <option value="gbu">ГБУ УТНКР</option>
                <option value="other">Иной</option>
              </select>
              <input value={newMember.name} onChange={(e) => setNewMember((x) => ({ ...x, name: e.target.value }))} placeholder="ФИО или организация" />
              <button
                className="btn ghost sm"
                onClick={() => {
                  if (newMember.name.trim()) {
                    set("members", [...f.members, newMember]);
                    setNewMember({ role: "spo", name: "" });
                  }
                }}
              >＋</button>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Заметка к выезду (опционально)</label>
          <textarea
            rows={2}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="напр. Связаться с СПО за день, согласовать время"
          />
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}

function labelOfRole(r: string) {
  return ({ rks: "РКС-НР", spo: "СПО", ppk: "ППК ЕЗ", adm: "Администрация", gbu: "ГБУ", other: "Иной" } as Record<string, string>)[r] || r;
}

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
