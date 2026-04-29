"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Pill } from "./Pill";
import { SendDocumentButton } from "./SendDocumentButton";

export interface DocumentMini {
  id: string;
  outgoingNumber: string;
  status: string;
  signedAt?: string | null;
  signerName?: string | null;
  signatureFingerprint?: string | null;
  edoStatus?: string | null;
  edoTrackId?: string | null;
  edoProvider?: string | null;
  hasFile: boolean;
  suggestedTo?: string[];
  suggestedCc?: string[];
}

export function DocumentActions({ doc }: { doc: DocumentMini }) {
  const router = useRouter();
  const [signOpen, setSignOpen] = useState(false);
  const [edoBusy, setEdoBusy] = useState(false);
  const [edoMsg, setEdoMsg] = useState<string | null>(null);

  async function checkEdo() {
    setEdoBusy(true);
    try {
      const r = await fetch(`/api/documents/${doc.id}/edo-send`);
      if (r.ok) router.refresh();
    } finally { setEdoBusy(false); }
  }

  async function sendEdo() {
    setEdoBusy(true); setEdoMsg(null);
    try {
      const r = await fetch(`/api/documents/${doc.id}/edo-send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "local" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setEdoMsg(`⚠ ${j.message || j.error || `Ошибка ${r.status}`}`);
        return;
      }
      const j = await r.json();
      setEdoMsg(`✓ ${j.trackId} (пакет: ${j.packagePath.split("/").pop()})`);
      router.refresh();
    } finally { setEdoBusy(false); }
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex gap-1.5 items-center flex-wrap">
        {doc.signedAt && <span title={doc.signatureFingerprint || ""}><Pill tone="moss">УКЭП</Pill></span>}
        {doc.edoStatus && <Pill tone={doc.edoStatus === "delivered" ? "moss" : "indigo"}>ЭДО · {doc.edoStatus}</Pill>}
      </div>
      <div className="flex gap-1.5 items-center flex-wrap">
        {doc.hasFile && (
          <a href={`/api/documents/${doc.id}/download`} className="btn ghost sm">↓ .docx</a>
        )}
        {doc.hasFile && (
          <SendDocumentButton
            documentId={doc.id}
            outgoingNumber={doc.outgoingNumber}
            suggestedTo={doc.suggestedTo}
            suggestedCc={doc.suggestedCc}
            small
          />
        )}
        {doc.hasFile && !doc.signedAt && (
          <button className="btn ghost sm" onClick={() => setSignOpen(true)}>✍ Подписать</button>
        )}
        {doc.hasFile && doc.signedAt && !doc.edoStatus && (
          <button className="btn ghost sm" disabled={edoBusy} onClick={sendEdo}>
            {edoBusy ? "…" : "📡 ЭДО"}
          </button>
        )}
        {doc.edoStatus && doc.edoStatus !== "delivered" && (
          <button className="btn ghost sm" disabled={edoBusy} onClick={checkEdo}>↻ статус</button>
        )}
      </div>
      {edoMsg && <div className="text-[11px]">{edoMsg}</div>}
      {signOpen && <SignModal doc={doc} onClose={() => setSignOpen(false)} />}
    </div>
  );
}

function SignModal({ doc, onClose }: { doc: DocumentMini; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr("Выберите .sig"); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("signerName", signerName);
      const r = await fetch(`/api/documents/${doc.id}/sign`, { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`Загрузка УКЭП · ${doc.outgoingNumber}`}
      subtitle="Файл подписи (.sig / CMS) приложится к документу"
      onClose={onClose}
      width={520}
      footer={
        <>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={upload} disabled={busy}>
            {busy ? "Загружаем…" : "Подписать"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="field">
          <label>Файл подписи (.sig)</label>
          <input type="file" accept=".sig,.p7s,.cms" ref={fileRef} />
          <div className="micro-2 text-muted mt-1">
            Подпись формируется внешним крипто-провайдером (КриптоПро / Рутокен).
            Здесь — приложение готового файла к документу.
          </div>
        </div>
        <div className="field">
          <label>ФИО подписавшего</label>
          <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="напр. Шарипов И.Р." />
        </div>
        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}
