"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export interface ContactView {
  id: string;
  lastName: string; firstName: string; middleName?: string | null;
  position?: string | null;
  dativePosition?: string | null;
  dativeName?: string | null;
  vocativeName?: string | null;
  shortName?: string | null;
  email?: string | null;
  isOurSignatory?: boolean;
  isOurExecutor?: boolean;
}

export function EditContactModal({ contact, onClose }: { contact: ContactView; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askDel, setAskDel] = useState(false);
  const [f, setF] = useState({
    lastName: contact.lastName, firstName: contact.firstName, middleName: contact.middleName || "",
    position: contact.position || "", dativePosition: contact.dativePosition || "",
    dativeName: contact.dativeName || "", vocativeName: contact.vocativeName || "",
    shortName: contact.shortName || "",
    email: contact.email || "",
    isOurSignatory: contact.isOurSignatory ?? false,
    isOurExecutor: contact.isOurExecutor ?? false,
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/contacts/${contact.id}`, {
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
      const r = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
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
      title={`Редактирование контакта · ${contact.shortName || contact.lastName}`}
      onClose={onClose}
      width={760}
      footer={
        <>
          {askDel ? (
            <>
              <span className="text-bordeaux text-[13px]">Точно удалить контакт?</span>
              <div className="flex-1" />
              <button className="btn ghost" onClick={() => setAskDel(false)} disabled={busy}>Отмена</button>
              <button className="btn bordeaux" onClick={del} disabled={busy}>Удалить</button>
            </>
          ) : (
            <>
              <button className="btn ghost" style={{ color: "var(--bordeaux)" }} onClick={() => setAskDel(true)}>Удалить</button>
              <div className="flex-1" />
              <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
              <button className="btn bordeaux" onClick={save} disabled={busy || !f.lastName || !f.firstName}>
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="field"><label>Фамилия *</label><input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div className="field"><label>Имя *</label><input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
          <div className="field"><label>Отчество</label><input value={f.middleName} onChange={(e) => set("middleName", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field"><label>Должность (именительный)</label><input value={f.position} onChange={(e) => set("position", e.target.value)} /></div>
          <div className="field"><label>Должность (дательный)</label><input value={f.dativePosition} onChange={(e) => set("dativePosition", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field"><label>ФИО в дательном</label><input value={f.dativeName} onChange={(e) => set("dativeName", e.target.value)} /></div>
          <div className="field"><label>Звательный</label><input value={f.vocativeName} onChange={(e) => set("vocativeName", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field"><label>Краткое (для подписи)</label><input value={f.shortName} onChange={(e) => set("shortName", e.target.value)} /></div>
          <div className="field"><label>E-mail</label><input value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="check">
            <input type="checkbox" checked={f.isOurSignatory} onChange={(e) => set("isOurSignatory", e.target.checked)} />
            подписант с нашей стороны
          </label>
          <label className="check">
            <input type="checkbox" checked={f.isOurExecutor} onChange={(e) => set("isOurExecutor", e.target.checked)} />
            исполнитель с нашей стороны
          </label>
        </div>
        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
