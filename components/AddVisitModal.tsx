"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

const KINDS = [
  { key: "initial", label: "Первичный" },
  { key: "repeat", label: "Повторный" },
  { key: "final", label: "Финальный" },
];
const RESULTS = [
  { key: "defects_found", label: "Дефекты подтверждены" },
  { key: "partially_resolved", label: "Частично устранены" },
  { key: "resolved", label: "Устранены полностью" },
];

export interface PlannedVisit {
  id: string;
  visitDate: string;     // ISO
  kind: "initial" | "repeat" | "final";
  members?: Array<{ role: string; name: string }>;
  notes?: string | null;
}

export function AddVisitModal({
  caseId, onClose, fromPlanned,
}: {
  caseId: string;
  onClose: () => void;
  /** Если задан — фиксируем этот запланированный выезд (PATCH), иначе создаём новый (POST). */
  fromPlanned?: PlannedVisit;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    visitDate: fromPlanned?.visitDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    kind: (fromPlanned?.kind || "repeat") as "initial" | "repeat" | "final",
    result: "defects_found",
    findings: fromPlanned?.notes ? `Заметка перед выездом: ${fromPlanned.notes}\n\n` : "",
    members: fromPlanned?.members?.length ? fromPlanned.members : [
      { role: "rks", name: "М.Ю. Пальков" },
      { role: "rks", name: "А.С. Горчаков" },
    ] as Array<{ role: string; name: string }>,
  });
  const [newMember, setNewMember] = useState({ role: "spo", name: "" });
  const [photos, setPhotos] = useState<File[]>([]);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("visitDate", f.visitDate);
      fd.append("kind", f.kind);
      fd.append("result", f.result);
      fd.append("findings", f.findings);
      fd.append("members", JSON.stringify(f.members));
      photos.forEach((p) => fd.append("photo", p));

      const isPatch = Boolean(fromPlanned);
      const url = isPatch
        ? `/api/cases/${caseId}/visits/${fromPlanned!.id}`
        : `/api/cases/${caseId}/visits`;
      // Для нового — режим "record"
      if (!isPatch) fd.append("mode", "record");

      const r = await fetch(url, { method: isPatch ? "PATCH" : "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || j.message || `Ошибка ${r.status}`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  const title = fromPlanned
    ? `Зафиксировать выезд от ${formatDate(fromPlanned.visitDate)}`
    : "Зафиксировать выезд";

  const subtitle = fromPlanned
    ? "Дозаполните итог, фото и описание. Запланированный визит станет состоявшимся."
    : "Запишет событие в хронологию дела и при «устранены» переведёт состояние";

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      width={700}
      footer={
        <>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy}>
            {busy ? "Сохраняем…" : (fromPlanned ? "Зафиксировать" : "Сохранить")}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
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
          <div className="field">
            <label>Итог *</label>
            <select value={f.result} onChange={(e) => set("result", e.target.value)}>
              {RESULTS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
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
          <label>Что выявили / описание</label>
          <textarea rows={3} value={f.findings} onChange={(e) => set("findings", e.target.value)} placeholder="напр. Дефекты по оконным блокам в МОП подъезда 2 не устранены…" />
        </div>

        <div className="field">
          <label>Фото с выезда (с камеры или галереи)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files || []))}
          />
          {photos.length > 0 && (
            <div className="micro-2 text-muted mt-1">{photos.length} фото · {(photos.reduce((s, p) => s + p.size, 0) / 1024 / 1024).toFixed(2)} МБ</div>
          )}
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}

function labelOfRole(r: string) {
  return ({ rks: "РКС-НР", spo: "СПО", ppk: "ППК ЕЗ", adm: "Администрация", gbu: "ГБУ", other: "Иной" } as Record<string, string>)[r] || r;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
