"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function AddContactModal({
  organizationId, organizationShortName, onClose,
}: {
  organizationId: string; organizationShortName: string; onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    lastName: "", firstName: "", middleName: "",
    position: "", dativePosition: "", dativeName: "", vocativeName: "",
    email: "",
    isOurSignatory: false, isOurExecutor: false,
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  // авто-подсказки полей
  function autoFill() {
    const ln = f.lastName.trim();
    const fn = f.firstName.trim();
    const mn = f.middleName.trim();
    if (!ln || !fn) return;
    set("dativeName", `${fn[0]}.${mn[0] ? mn[0] + "." : ""} ${dat(ln)}`);
    set("vocativeName", `Уважаемый ${fn} ${mn}!`.replace(/\s+!/, "!"));
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/organizations/${organizationId}/contacts`, {
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
      title={`Добавить контакт · ${organizationShortName}`}
      subtitle="ФИО в трёх формах нужно для шаблонов писем (адресат, копия, обращение)"
      onClose={onClose}
      width={760}
      footer={
        <>
          <div className="micro text-muted">
            Подсказка: укажите дательный вариант — он попадёт в строку «Адресат» письма
          </div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy || !f.lastName || !f.firstName}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="field">
            <label>Фамилия *</label>
            <input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} onBlur={autoFill} />
          </div>
          <div className="field">
            <label>Имя *</label>
            <input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} onBlur={autoFill} />
          </div>
          <div className="field">
            <label>Отчество</label>
            <input value={f.middleName} onChange={(e) => set("middleName", e.target.value)} onBlur={autoFill} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Должность (именительный)</label>
            <input value={f.position} onChange={(e) => set("position", e.target.value)} placeholder="Заместитель ген. директора" />
          </div>
          <div className="field">
            <label>Должность (дательный)</label>
            <input value={f.dativePosition} onChange={(e) => set("dativePosition", e.target.value)} placeholder="Заместителю генерального директора" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>ФИО в дательном (для шапки)</label>
            <input value={f.dativeName} onChange={(e) => set("dativeName", e.target.value)} placeholder="Д.А. Зиаи" />
          </div>
          <div className="field">
            <label>Звательный (для обращения)</label>
            <input value={f.vocativeName} onChange={(e) => set("vocativeName", e.target.value)} placeholder="Уважаемый Данис Айратович!" />
          </div>
        </div>

        <div className="field">
          <label>E-mail</label>
          <input value={f.email} onChange={(e) => set("email", e.target.value)} />
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

function dat(surname: string) {
  // упрощённое склонение: «Зиаи» → «Зиаи» (несклоняемая), «Иванов» → «Иванову» — для большинства русских мужских.
  // Это эвристика. Если фамилия не -ов/-ев/-ин/-ский — оставляем как есть.
  if (/(ов|ев|ин|ский|цкий)$/i.test(surname)) {
    return surname.replace(/(ий)$/i, "ому").replace(/$/, "у");
  }
  return surname;
}
