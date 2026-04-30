"use client";

// Блок «Все файлы дела» — единый список файлов с группировкой по типу и
// кнопкой ZIP-выгрузки. Также даёт точку входа для модалки истории версий
// (для kind ∈ incoming/document/visit_photo).

import { useState } from "react";
import type { CaseFile } from "@/lib/queries";
import { FileRevisionsModal } from "./FileRevisionsModal";

const KIND_LABEL: Record<CaseFile["kind"], string> = {
  incoming: "Входящие",
  document: "Документы",
  signature: "Подписи УКЭП",
  edo: "ЭДО-пакеты",
  visit_photo: "Фото с выездов",
};

const KIND_ORDER: CaseFile["kind"][] = [
  "incoming",
  "document",
  "signature",
  "edo",
  "visit_photo",
];

// Только эти типы поддерживают версии (signature и edo обычно не
// перезаливают — это однократные артефакты).
const VERSIONABLE: CaseFile["kind"][] = ["incoming", "document", "visit_photo"];

export function CaseFilesBlock({ caseId, files }: { caseId: string; files: CaseFile[] }) {
  const [history, setHistory] = useState<{ ownerType: string; ownerId: string } | null>(null);

  if (files.length === 0) {
    return (
      <div className="frame p-5">
        <div className="micro text-muted">Файлы дела</div>
        <div className="text-[13px] text-muted mt-2">
          К делу пока не привязано ни одного файла.
        </div>
      </div>
    );
  }

  const grouped = files.reduce<Record<string, CaseFile[]>>((acc, f) => {
    (acc[f.kind] ||= []).push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="frame p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div className="micro text-muted">Все файлы дела ({files.length})</div>
          <a
            href={`/api/cases/${caseId}/files.zip`}
            className="btn ghost sm"
            download
          >
            ↓ Всё ZIP-ом
          </a>
        </div>
        {KIND_ORDER.filter((k) => grouped[k]?.length).map((k) => (
          <div key={k} className="mb-4 last:mb-0">
            <div className="micro-2 text-muted mb-1.5">{KIND_LABEL[k]}</div>
            <ul className="grid gap-1.5 text-[13px]">
              {grouped[k].map((f) => (
                <li
                  key={`${f.kind}-${f.ownerId}-${f.relPath}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate flex-1 min-w-0">{f.label}</span>
                  <div className="flex items-center gap-1 flex-none">
                    {VERSIONABLE.includes(k) && (
                      <button
                        type="button"
                        className="text-muted hover:text-ink text-[11px] underline-offset-2 hover:underline"
                        onClick={() =>
                          setHistory({
                            ownerType: k,
                            ownerId: f.ownerId,
                          })
                        }
                      >
                        история
                      </button>
                    )}
                    <a
                      className="mono text-muted hover:text-ink"
                      href={`/api/files/download?path=${encodeURIComponent(f.relPath)}`}
                      title="Скачать"
                      download
                    >
                      ↓
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {history && (
        <FileRevisionsModal
          ownerType={history.ownerType}
          ownerId={history.ownerId}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}
