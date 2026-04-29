"use client";

import { useState } from "react";
import { GenerateButton, ContactOption } from "./GenerateButton";
import { AddVisitModal } from "./AddVisitModal";
import { PlanVisitModal } from "./PlanVisitModal";
import { SpoResponseModal } from "./SpoResponseModal";
import { CloseCaseModal } from "./CloseCaseModal";
import type { TemplateDescriptor } from "@/lib/workflow";

export function CaseActionsBar(props: {
  caseId: string;
  isClosed: boolean;
  templates: TemplateDescriptor[];
  spoContactIds: ContactOption[];
  ppkContactIds: ContactOption[];
  ourSignatories: ContactOption[];
  ourExecutors: ContactOption[];
  defaultSubject: string;
}) {
  const [planVisit, setPlanVisit] = useState(false);
  const [recordVisit, setRecordVisit] = useState(false);
  const [spo, setSpo] = useState(false);
  const [close, setClose] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2 rise rise-1">
      {!props.isClosed ? (
        <>
          <GenerateButton {...props} />
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn ghost text-[12px]" onClick={() => setPlanVisit(true)}>🗓 Запланировать выезд</button>
            <button className="btn ghost text-[12px]" onClick={() => setRecordVisit(true)}>＋ Зафиксировать выезд</button>
            <button className="btn ghost text-[12px]" onClick={() => setSpo(true)}>＋ Ответ от СПО</button>
            <button className="btn ghost text-[12px]" onClick={() => setClose(true)}>Закрыть дело</button>
          </div>
        </>
      ) : (
        <>
          <span className="pill moss">дело закрыто</span>
          <button className="btn ghost text-[12px]" onClick={() => setClose(true)}>Возобновить</button>
        </>
      )}

      {planVisit && <PlanVisitModal caseId={props.caseId} onClose={() => setPlanVisit(false)} />}
      {recordVisit && <AddVisitModal caseId={props.caseId} onClose={() => setRecordVisit(false)} />}
      {spo && <SpoResponseModal caseId={props.caseId} onClose={() => setSpo(false)} />}
      <CloseCaseModal caseId={props.caseId} isOpen={close} onClose={() => setClose(false)} />
    </div>
  );
}
