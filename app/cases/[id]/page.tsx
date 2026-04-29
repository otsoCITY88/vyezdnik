import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateLong, dateShort, relativeDay, safeJSON, daysFromToday } from "@/lib/format";
import { CASE_STATES, STATE_LABELS, STATE_TONE, templatesAvailableIn, CaseState } from "@/lib/workflow";
import { Pill, PillTone } from "@/components/Pill";
import { CaseActionsBar } from "@/components/CaseActionsBar";
import { AiCaseAssistant } from "@/components/AiCaseAssistant";
import { CaseVisitsBlock, VisitView } from "@/components/CaseVisitsBlock";

export const dynamic = "force-dynamic";

export default async function CaseDetail(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const caseRec = await prisma.case.findUnique({
    where: { id },
    include: {
      building: true,
      subcontractor: { include: { contacts: true } },
      contract: true,
      responsibleUser: true,
      incomingLetter: { include: { fromOrganization: true } },
      events: { orderBy: { occurredAt: "desc" } },
      visits: { orderBy: { visitDate: "desc" } },
      documents: { orderBy: { outgoingDate: "desc" } },
    },
  });
  if (!caseRec) notFound();

  const state = caseRec.state as CaseState;
  const tone = (STATE_TONE[state] ?? "neutral") as PillTone;
  const stateLabel = STATE_LABELS[state] ?? state;
  const deadlines = safeJSON<Record<string, string>>(caseRec.deadlines, {});
  const deadlineEntries = Object.entries(deadlines).filter(([, v]) => Boolean(v));
  const nearest = deadlineEntries
    .map(([k, v]) => ({ key: k, iso: v, date: new Date(v) }))
    .filter((d) => !isNaN(d.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const availableTemplates = templatesAvailableIn(state);

  const clauses = safeJSON<{
    warranty?: string[]; remedy?: string[]; responsibility?: string[]; info_request?: string[]; penalty?: string[];
  }>(caseRec.contract?.clauses, {});

  const ourSignatories = await prisma.contact.findMany({
    where: { isOurSignatory: true },
    include: { organization: true },
  });
  const ourExecutors = await prisma.contact.findMany({
    where: { isOurExecutor: true },
  });
  const spoContacts = caseRec.subcontractor.contacts;
  const ppk = await prisma.organization.findFirst({
    where: { kind: "customer" },
    include: { contacts: true },
  });

  return (
    <section className="px-8 pt-8 pb-16">
      {/* breadcrumbs */}
      <div className="flex items-center gap-2 micro text-muted">
        <Link href="/cases" className="hover:underline">Дела</Link>
        <span>›</span>
        <span style={{ color: "var(--ink)" }}>{caseRec.caseNumber}</span>
      </div>

      {/* heading */}
      <div className="flex items-start justify-between mt-3 gap-6">
        <div className="rise">
          <div className="micro text-muted">
            Дело № <span className="mono" style={{ color: "var(--ink)" }}>{caseRec.caseNumber}</span> ·
            открыто {dateShort(caseRec.createdAt)}
          </div>
          <h1 className="display text-[56px] leading-[1] mt-2 tracking-tight">
            {caseRec.building.shortAddress.split(",")[0]}
            {caseRec.building.apartment && (
              <>, <span style={{ fontStyle: "italic", fontWeight: 400 }}>кв. {caseRec.building.apartment}</span></>
            )}
          </h1>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Pill tone={tone}>{stateLabel}</Pill>
            {nearest && (
              <>
                <span className="micro text-muted">Ближайший дедлайн</span>
                <span className={`mono text-[14px] ${(nearest.date.getTime() < Date.now()) ? "text-bordeaux" : ""}`}>
                  {dateShort(nearest.iso)} · {relativeDay(nearest.iso)}
                </span>
              </>
            )}
          </div>
        </div>

        <CaseActionsBar
          caseId={caseRec.id}
          isClosed={caseRec.state === "closed"}
          templates={availableTemplates}
          spoContactIds={spoContacts.map((c) => ({
            id: c.id,
            label: `${c.dativeName || c.shortName || c.lastName} · ${c.position || "—"}`,
          }))}
          ppkContactIds={(ppk?.contacts || []).map((c) => ({
            id: c.id,
            label: `${c.shortName || c.lastName} · ${c.position || "—"}`,
          }))}
          ourSignatories={ourSignatories.map((c) => ({
            id: c.id,
            label: `${c.shortName || c.lastName} · ${c.position || "—"}`,
          }))}
          ourExecutors={ourExecutors.map((c) => ({
            id: c.id,
            label: `${c.shortName || c.lastName} · ${c.position || "—"}`,
          }))}
          defaultSubject={`Об устранении замечаний ${caseRec.building.shortAddress}`}
        />
      </div>

      <div className="ruler my-8" />

      <div className="grid gap-8" style={{ gridTemplateColumns: "360px 1fr" }}>

        {/* ========= passport ========= */}
        <div className="rise">
          <div className="frame p-5">
            <div className="micro text-muted">Паспорт дела</div>
            <div className="ruler my-4" />

            <dl className="grid gap-4">
              <Row label="Заявитель">{caseRec.incomingLetter?.applicantName || "—"}</Row>
              <Row label="Объект">{caseRec.building.fullAddress}</Row>
              <Row label="Субподрядчик">
                {caseRec.subcontractor.fullName}
                {spoContacts[0] && (
                  <div className="micro-2 text-muted mt-0.5">
                    {spoContacts[0].shortName} · {spoContacts[0].email}
                  </div>
                )}
              </Row>
              {caseRec.contract && (
                <Row label="Договор">
                  <span className="mono text-[13px]">№ {caseRec.contract.number} от {dateShort(caseRec.contract.date)}</span>
                  <div className="micro-2 text-muted mt-0.5">
                    {clauses.warranty && <>гарантии п. {clauses.warranty.join(", ")} · </>}
                    {clauses.remedy && <>устранение п. {clauses.remedy.join(", ")}</>}
                  </div>
                </Row>
              )}
              {caseRec.incomingLetter && (
                <Row label="Входящее">
                  <span className="mono text-[13px]">{caseRec.incomingLetter.number} от {dateShort(caseRec.incomingLetter.incomingDate)}</span>
                  <div className="micro-2 text-muted mt-0.5">{caseRec.incomingLetter.applicantOrigin}</div>
                </Row>
              )}
              <Row label="Ответственный">
                {caseRec.responsibleUser ? (
                  <div className="flex items-center gap-2">
                    <span className="display w-6 h-6 grid place-items-center text-[12px]"
                      style={{ background: "var(--ink)", color: "var(--paper)" }}>
                      {(caseRec.responsibleUser.shortName || "??").slice(0, 2).toUpperCase().replace(/[^А-ЯA-Z]/g, "")}
                    </span>
                    {caseRec.responsibleUser.fullName}
                  </div>
                ) : "—"}
              </Row>
            </dl>

            <div className="ruler my-4" />
            <div className="micro text-muted mb-2">Сроки</div>
            <ul className="text-[12.5px] space-y-2">
              {deadlineEntries.length === 0 ? (
                <li className="text-muted">сроки не выставлены</li>
              ) : deadlineEntries.map(([k, v]) => {
                const days = daysFromToday(v);
                const cls = days != null && days < 0 ? "text-bordeaux" : days != null && days <= 1 ? "text-amber" : "";
                return (
                  <li key={k} className="flex justify-between gap-3">
                    <span>{deadlineLabel(k)}</span>
                    <span className={`mono ${cls}`}>{dateShort(v)} · {relativeDay(v)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* incoming letter (PDF + реквизиты) */}
          {caseRec.incomingLetter && (
            <div className="frame mt-6 p-5">
              <div className="flex items-center justify-between">
                <div className="micro text-muted">Входящее письмо</div>
                {caseRec.incomingLetter.attachedFile && (
                  <span className="pill" style={{ background: "var(--bordeaux-bg)", borderColor: "#DCA9A4", color: "var(--bordeaux)" }}>
                    PDF · {caseRec.incomingLetter.pageCount || "?"} л.
                  </span>
                )}
              </div>
              <div className="ruler my-4" />
              <div className="grid gap-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Исх. №</span>
                  <span className="mono">{caseRec.incomingLetter.number}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Дата</span>
                  <span className="mono">{dateShort(caseRec.incomingLetter.incomingDate)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">От кого</span>
                  <span className="text-right">{caseRec.incomingLetter.fromOrganization.shortName}</span>
                </div>
                {caseRec.incomingLetter.applicantName && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Заявитель</span>
                    <span className="text-right">{caseRec.incomingLetter.applicantName}</span>
                  </div>
                )}
                {caseRec.incomingLetter.applicantOrigin && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Источник</span>
                    <span className="text-right text-[12px]">{caseRec.incomingLetter.applicantOrigin}</span>
                  </div>
                )}
                {caseRec.incomingLetter.applicantLetterNumber && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">№ обращения</span>
                    <span className="mono text-[12px]">
                      {caseRec.incomingLetter.applicantLetterNumber}
                      {caseRec.incomingLetter.applicantLetterDate && ` от ${dateShort(caseRec.incomingLetter.applicantLetterDate)}`}
                    </span>
                  </div>
                )}
              </div>
              {caseRec.incomingLetter.subject && (
                <>
                  <div className="ruler my-3" />
                  <div className="text-[13px] read" style={{ color: "var(--ink-2)" }}>
                    «{caseRec.incomingLetter.subject}»
                  </div>
                </>
              )}
              {caseRec.incomingLetter.attachedFile ? (
                <>
                  <div className="ruler my-3" />
                  <div className="flex gap-2">
                    <a
                      href={`/api/incoming/${caseRec.incomingLetter.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost sm"
                    >
                      📄 Открыть PDF
                    </a>
                    <a
                      href={`/api/incoming/${caseRec.incomingLetter.id}/file?download=1`}
                      className="btn ghost sm"
                    >
                      ↓ Скачать
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="ruler my-3" />
                  <div className="micro-2 text-muted">PDF не приложен (письмо заведено вручную)</div>
                </>
              )}
            </div>
          )}

          {/* documents */}
          <div className="frame mt-6 p-5">
            <div className="micro text-muted">Документы дела</div>
            <div className="ruler my-4" />
            {caseRec.documents.length === 0 ? (
              <div className="text-[13px] text-muted">пока нет документов</div>
            ) : (
              <ul className="text-[13px] space-y-3">
                {caseRec.documents.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3 items-start">
                    <div className="min-w-0">
                      <div className="mono text-[12px] text-muted truncate">
                        {d.outgoingNumber || d.templateKind} · {d.outgoingDate ? dateShort(d.outgoingDate) : "—"}
                      </div>
                      <div className="truncate">{d.subject || "—"}</div>
                    </div>
                    <Pill tone={d.status === "sent" ? "moss" : d.status === "rendered" ? "indigo" : "neutral"}>
                      {d.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* visits */}
          <CaseVisitsBlock
            caseId={caseRec.id}
            visits={caseRec.visits.map<VisitView>((v) => ({
              id: v.id,
              visitDate: v.visitDate.toISOString(),
              kind: v.kind as "initial" | "repeat" | "final",
              status: (v.status || "done") as "planned" | "done" | "cancelled",
              result: v.result,
              findings: v.findings,
              members: safeJSON<Array<{ role: string; name: string }>>(v.commissionMembers, []),
              photos: safeJSON<unknown[]>(v.photos, []).length,
            }))}
          />
        </div>

        {/* ========= timeline ========= */}
        <div className="rise rise-1">
          <AiCaseAssistant caseId={caseRec.id} />
          <div className="ruler my-6" />
          <div className="flex items-center justify-between mb-4">
            <div className="micro text-muted">Хронология</div>
            <div className="flex items-center gap-2">
              <span className="pill solid">События</span>
              <span className="pill ghost">Документы</span>
              <span className="pill ghost">Выезды</span>
            </div>
          </div>

          <div className="tl">
            {caseRec.events.length === 0 ? (
              <div className="text-muted text-[14px] tl-node">События ещё не зарегистрированы</div>
            ) : (
              caseRec.events.map((e) => {
                const t =
                  e.kind === "deadline_set" || e.kind === "state_changed" && /просроч/i.test(e.title) ? "bordeaux" :
                  e.kind === "letter_sent" ? "neutral" :
                  e.kind === "visit" ? "moss" :
                  e.kind === "incoming" ? "indigo" : "";
                return (
                  <div key={e.id} className={`tl-node ${t}`}>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="mono text-[12px] text-muted">{dateShort(e.occurredAt)}</span>
                      <Pill tone={
                        e.kind === "letter_sent" ? "neutral"
                        : e.kind === "visit" ? "moss"
                        : e.kind === "incoming" ? "indigo"
                        : e.kind === "deadline_set" ? "bordeaux"
                        : "neutral"
                      }>
                        {kindLabel(e.kind)}
                      </Pill>
                    </div>
                    <div className="mt-1.5 read text-[15px]">{e.title}</div>
                    {e.description && <div className="micro-2 text-muted mt-2">{e.description}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="micro-2 text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function deadlineLabel(key: string): string {
  return ({
    spo_response: "Ответ СПО",
    next_visit: "Следующий выезд",
    warranty_remedy: "Устранение по гарантии",
    payment_demand: "Оплата претензии",
    remedy: "Устранение",
  } as Record<string, string>)[key] || key;
}

function kindLabel(k: string): string {
  return ({
    letter_sent: "отправлено",
    visit: "выезд",
    incoming: "входящее",
    deadline_set: "дедлайн",
    state_changed: "состояние",
    spo_response: "ответ СПО",
  } as Record<string, string>)[k] || k;
}
