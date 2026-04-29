"use client";

import { useState, useRef, useEffect } from "react";
import { GenerateModal } from "./GenerateModal";
import type { TemplateDescriptor } from "@/lib/workflow";

export interface ContactOption { id: string; label: string }

export function GenerateButton({
  caseId,
  templates,
  spoContactIds,
  ppkContactIds,
  ourSignatories,
  ourExecutors,
  defaultSubject,
}: {
  caseId: string;
  templates: TemplateDescriptor[];
  spoContactIds: ContactOption[];
  ppkContactIds: ContactOption[];
  ourSignatories: ContactOption[];
  ourExecutors: ContactOption[];
  defaultSubject: string;
}) {
  const [open, setOpen] = useState(false);
  const [modalKind, setModalKind] = useState<TemplateDescriptor | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn bordeaux"
        onClick={() => setOpen((s) => !s)}
        disabled={templates.length === 0}
      >
        ＋ Сгенерировать <span className="opacity-70">▾</span>
      </button>
      {open && (
        <div className="menu">
          <div className="micro-2 text-muted px-3.5 py-2 border-b" style={{ borderColor: "var(--line-soft)" }}>
            Доступно для текущего этапа
          </div>
          {templates.map((t) => (
            <div
              key={t.kind}
              className="item"
              onClick={() => { setModalKind(t); setOpen(false); }}
            >
              <div>
                <div>{kindCode(t.kind)} · {t.title}</div>
                <div className="micro-2 text-muted mt-0.5">{t.subtitle}</div>
              </div>
              <span className="mono text-muted">⏎</span>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="px-4 py-3 text-muted">
              Для текущего этапа нет шаблонов. Зафиксируйте выезд или измените состояние.
            </div>
          )}
        </div>
      )}
      {modalKind && (
        <GenerateModal
          caseId={caseId}
          tpl={modalKind}
          onClose={() => setModalKind(null)}
          spoContactIds={spoContactIds}
          ppkContactIds={ppkContactIds}
          ourSignatories={ourSignatories}
          ourExecutors={ourExecutors}
          defaultSubject={defaultSubject}
        />
      )}
    </div>
  );
}

function kindCode(k: string): string {
  return k.split("_")[0];
}
