"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill } from "./Pill";
import { UploadIncomingModal } from "./UploadIncomingModal";
import { AttachIncomingModal } from "./AttachIncomingModal";

interface IncomingView {
  id: string; number: string; subject?: string | null; pageCount?: number | null;
  fromShort: string; dateShort: string;
  applicantName?: string | null; applicantOrigin?: string | null;
  buildingFull?: string | null;
  linkedCaseId?: string | null; linkedCaseNumber?: string | null;
}

interface Opt { id: string; label: string }
interface CaseOpt { id: string; caseNumber: string; address: string; spo: string }

export function InboxScreen({
  unlinked, linked, fromOrganizations, buildings, cases,
}: {
  unlinked: IncomingView[]; linked: IncomingView[];
  fromOrganizations: Opt[]; buildings: Opt[]; cases: CaseOpt[];
}) {
  const router = useRouter();
  const [openUpload, setOpenUpload] = useState(false);
  const [attaching, setAttaching] = useState<IncomingView | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncImap() {
    setSyncBusy(true); setSyncMsg(null);
    try {
      const r = await fetch("/api/incoming/sync", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        setSyncMsg(`✓ Получено: ${j.fetched}, сохранено: ${j.saved}, пропущено: ${j.skipped}`);
        router.refresh();
      } else {
        setSyncMsg(`⚠ ${(j.errors || []).join("; ") || "ошибка"}`);
      }
    } catch (e: unknown) {
      setSyncMsg(`⚠ ${e instanceof Error ? e.message : "ошибка"}`);
    } finally { setSyncBusy(false); }
  }

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Входящие</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Письма от ППК и СПО</h1>
          <p className="read mt-2 text-[16px] text-muted">
            {unlinked.length} непривязанных, {linked.length} с заведённым делом
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn ghost" onClick={syncImap} disabled={syncBusy}>
            {syncBusy ? "Синхронизация…" : "↻ IMAP sync"}
          </button>
          <button className="btn" onClick={() => setOpenUpload(true)}>＋ Загрузить файл</button>
        </div>
      </div>

      {syncMsg && (
        <div className="frame p-3 mt-4 text-[13px]" style={{ background: syncMsg.startsWith("✓") ? "var(--moss-bg)" : "var(--amber-bg)" }}>
          {syncMsg}
        </div>
      )}

      <div className="ruler my-7" />

      {unlinked.length > 0 && (
        <>
          <div className="micro text-muted mb-3">К обработке</div>
          <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {unlinked.map((i) => (
              <article id={i.id} key={i.id} className="frame p-5">
                <div className="flex items-center gap-3">
                  <div className="display text-[14px] w-9 h-9 grid place-items-center"
                       style={{ background: "var(--bordeaux)", color: "var(--paper)" }}>PDF</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.subject || i.number}</div>
                    <div className="micro-2 text-muted mt-0.5">
                      от {i.fromShort} · {i.pageCount ? `${i.pageCount} л.` : "—"}
                    </div>
                  </div>
                  <Pill tone="amber">не привязано</Pill>
                </div>
                <div className="ruler my-4" />
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                  <Field label="Исх. №">{i.number}</Field>
                  <Field label="Дата">{i.dateShort}</Field>
                  {i.applicantName && <Field label="Заявитель">{i.applicantName}</Field>}
                  {i.applicantOrigin && <Field label="Источник" wide>{i.applicantOrigin}</Field>}
                  {i.buildingFull && <Field label="Объект" wide>{i.buildingFull}</Field>}
                </dl>
                <div className="ruler my-4" />
                <div className="flex gap-2">
                  <Link href={`/cases/new?incoming=${i.id}`} className="btn">Создать дело →</Link>
                  <button className="btn ghost" onClick={() => setAttaching(i)}>Привязать к существующему</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="micro text-muted mb-3">Уже в работе</div>
      <div className="frame">
        <table className="editorial">
          <thead>
            <tr>
              <th>Исх. №</th><th>Дата</th><th>Объект</th><th>Заявитель</th><th>Дело</th>
            </tr>
          </thead>
          <tbody>
            {linked.map((i) => (
              <tr key={i.id} className="flat">
                <td className="mono">{i.number}</td>
                <td className="mono">{i.dateShort}</td>
                <td>{i.buildingFull || "—"}</td>
                <td>{i.applicantName || "—"}</td>
                <td className="mono">
                  {i.linkedCaseId
                    ? <Link href={`/cases/${i.linkedCaseId}`} className="hover:underline">{i.linkedCaseNumber}</Link>
                    : "—"}
                </td>
              </tr>
            ))}
            {linked.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted p-8">пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {openUpload && (
        <UploadIncomingModal
          fromOrganizations={fromOrganizations}
          buildings={buildings}
          onClose={() => setOpenUpload(false)}
        />
      )}
      {attaching && (
        <AttachIncomingModal
          incomingId={attaching.id}
          incomingNumber={attaching.number}
          cases={cases}
          onClose={() => setAttaching(null)}
        />
      )}
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="micro-2 text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
