"use client";

// Модалка со списком версий файла + откат к предыдущей версии.
// Используется из CaseFilesBlock рядом с каждым версионируемым файлом.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface Revision {
  id: string;
  version: number;
  filename: string;
  size: number;
  uploadedAt: string;
  comment?: string | null;
}

const OWNER_LABEL: Record<string, string> = {
  incoming: "Входящее письмо",
  document: "Сгенерированный документ",
  visit_photo: "Фото с выезда",
};

export function FileRevisionsModal({
  ownerType,
  ownerId,
  onClose,
}: {
  ownerType: string;
  ownerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [revs, setRevs] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/files/revisions?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Revision[]) => {
        if (cancelled) return;
        setRevs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ownerType, ownerId]);

  async function rollback(id: string) {
    setBusy(id); setErr(null);
    try {
      const r = await fetch(`/api/files/revisions/${id}`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Ошибка ${r.status}`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка отката");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title={`История версий · ${OWNER_LABEL[ownerType] || ownerType}`}
      subtitle="Каждая перезалитая версия сохраняется. Можно скачать любую или откатить как новую."
      onClose={onClose}
      width={620}
    >
      {loading ? (
        <div className="text-muted text-[13px]">Загружаем…</div>
      ) : revs.length === 0 ? (
        <div className="text-muted text-[13px]">
          Версий ещё нет. Они появятся после первой перезаливки файла.
        </div>
      ) : (
        <ul className="grid gap-2 text-[13px]">
          {revs.map((r) => (
            <li
              key={r.id}
              className="frame p-3 flex items-center gap-3"
              style={{ background: "var(--paper-2)" }}
            >
              <div className="mono text-[12px]" style={{ minWidth: 32 }}>v{r.version}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate">{r.filename}</div>
                <div className="micro-2 text-muted">
                  {new Date(r.uploadedAt).toLocaleString("ru-RU", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                  {" · "}
                  {(r.size / 1024).toFixed(1)} КБ
                  {r.comment ? ` · ${r.comment}` : ""}
                </div>
              </div>
              <button
                className="btn ghost sm"
                disabled={busy !== null}
                onClick={() => rollback(r.id)}
              >
                {busy === r.id ? "Откатываем…" : "↩ Откатить"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && (
        <div className="text-bordeaux text-[13px] mt-3">{err}</div>
      )}
    </Modal>
  );
}
