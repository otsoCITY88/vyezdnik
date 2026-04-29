"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function SendDocumentButton({
  documentId, suggestedTo = [], suggestedCc = [], outgoingNumber,
  small = false,
}: {
  documentId: string;
  suggestedTo?: string[];
  suggestedCc?: string[];
  outgoingNumber: string;
  small?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [to, setTo] = useState(suggestedTo.join(", "));
  const [cc, setCc] = useState(suggestedCc.join(", "));
  const [message, setMessage] = useState("");

  async function send() {
    setBusy(true); setErr(null); setDone(null);
    try {
      const r = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.split(/[,;]/).map((x) => x.trim()).filter(Boolean),
          cc: cc.split(/[,;]/).map((x) => x.trim()).filter(Boolean),
          message: message || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      const j = await r.json();
      setDone(j.delivery === "smtp"
        ? `Отправлено через SMTP · ${j.messageId || ""}`
        : `Сохранено в dev-outbox: ${j.outboxPath}`);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button className={`btn ghost ${small ? "sm" : ""}`} onClick={() => setOpen(true)}>✉ Отправить</button>
      {open && (
        <Modal
          title={`Отправить по e-mail · ${outgoingNumber}`}
          subtitle="Адресаты подтянуты из карточки документа; можно переопределить"
          onClose={() => { setOpen(false); setDone(null); setErr(null); }}
          width={620}
          footer={
            done ? (
              <>
                <span className="text-moss text-[13px]">{done}</span>
                <div className="flex-1" />
                <button className="btn ghost" onClick={() => { setOpen(false); setDone(null); }}>Закрыть</button>
              </>
            ) : (
              <>
                <div className="flex-1" />
                <button className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>Отмена</button>
                <button className="btn bordeaux" onClick={send} disabled={busy || !to.trim()}>
                  {busy ? "Отправка…" : "Отправить"}
                </button>
              </>
            )
          }
        >
          <div className="grid gap-4">
            <div className="field">
              <label>Кому *</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="через запятую" />
            </div>
            <div className="field">
              <label>Копия</label>
              <input value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div className="field">
              <label>Сопроводительное сообщение</label>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Если оставить пустым — будет шаблон по умолчанию" />
            </div>
            {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}
