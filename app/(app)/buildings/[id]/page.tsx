// Карточка объекта МКД с агрегированной историей по всем делам этого
// объекта. Цель — оператор быстро понимает контекст конкретного дома:
// какие дела в работе, что было раньше, какие письма приходили.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateShort } from "@/lib/format";
import { listCases } from "@/lib/queries";
import { CaseRowsTable } from "@/components/CaseRowsTable";

export const dynamic = "force-dynamic";

export default async function BuildingPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const b = await prisma.building.findUnique({
    where: { id },
    include: {
      subcontractor: true,
      contract: true,
      cases: {
        include: {
          events: { orderBy: { occurredAt: "desc" }, take: 50 },
        },
      },
      incomingLetters: {
        include: { fromOrganization: true },
        orderBy: { incomingDate: "desc" },
      },
    },
  });
  if (!b) notFound();

  // Дела фильтруем из общего listCases — чтобы получить нормальные CaseRow
  // с deadlines/state-tone/responsible, как в реестре.
  const allRows = await listCases();
  const myRows = allRows.filter((r) => r.buildingId === id);
  const openRows = myRows.filter((r) => r.state !== "closed");
  const closedRows = myRows.filter((r) => r.state === "closed");

  // Хронология — все events из всех дел этого объекта,
  // отсортированные по дате (новые сверху). Лимит 30.
  const timeline = b.cases
    .flatMap((c) =>
      c.events.map((e) => ({ ...e, caseNumber: c.caseNumber })),
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 30);

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">МКД</div>
          <h1 className="display text-[44px] leading-none mt-2 tracking-tight">
            {b.shortAddress}
          </h1>
          <p className="read mt-2 text-[16px] text-muted">{b.fullAddress}</p>
          <div className="micro-2 text-muted mt-2 flex gap-4 flex-wrap">
            <span>СПО: {b.subcontractor?.shortName || "—"}</span>
            <span>Договор: {b.contract?.number ? `№ ${b.contract.number}` : "—"}</span>
            <span>Всего дел: {myRows.length}</span>
            <span>Открытых: {openRows.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/buildings" className="btn ghost">← К списку</Link>
        </div>
      </div>

      <div className="ruler my-7" />

      {/* Активные дела */}
      <h2 className="display text-[24px] mb-3">
        Активные дела ({openRows.length})
      </h2>
      <div className="frame mb-8">
        <CaseRowsTable
          rows={openRows}
          showIncoming
          emptyHint="По этому объекту нет активных дел."
        />
      </div>

      {/* Хронология */}
      <h2 className="display text-[20px] mb-3">Хронология объекта</h2>
      <div className="frame p-4 mb-8">
        {timeline.length === 0 ? (
          <div className="text-muted text-[13px]">Событий пока нет.</div>
        ) : (
          <ul className="grid gap-2 text-[13px]">
            {timeline.map((e) => (
              <li
                key={e.id}
                className="grid gap-3 items-baseline"
                style={{ gridTemplateColumns: "100px 110px 1fr" }}
              >
                <span className="mono text-muted">{dateShort(e.occurredAt)}</span>
                <Link
                  href={`/cases/${e.caseId}`}
                  className="mono hover:underline"
                >
                  {e.caseNumber}
                </Link>
                <div className="min-w-0">
                  <div className="truncate">{e.title}</div>
                  {e.description && (
                    <div className="micro-2 text-muted truncate">
                      {e.description}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Входящие */}
      <h2 className="display text-[20px] mb-3">
        Входящие по объекту ({b.incomingLetters.length})
      </h2>
      <div className="frame mb-8">
        <table className="editorial">
          <thead>
            <tr>
              <th>Исх. №</th>
              <th>Дата</th>
              <th>От</th>
              <th>Заявитель</th>
              <th>Дело</th>
            </tr>
          </thead>
          <tbody>
            {b.incomingLetters.map((i) => (
              <tr key={i.id} className="flat">
                <td className="mono">{i.number}</td>
                <td className="mono">{dateShort(i.incomingDate)}</td>
                <td>{i.fromOrganization.shortName}</td>
                <td>{i.applicantName || "—"}</td>
                <td className="mono">
                  {i.linkedCaseId ? (
                    <Link
                      href={`/cases/${i.linkedCaseId}`}
                      className="hover:underline"
                    >
                      открыть
                    </Link>
                  ) : (
                    <span className="text-muted">без дела</span>
                  )}
                </td>
              </tr>
            ))}
            {b.incomingLetters.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted p-6">
                  По этому объекту входящих писем нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Закрытые дела — свёрнутые */}
      {closedRows.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted text-[13px] mb-3">
            Закрытые дела ({closedRows.length})
          </summary>
          <div className="frame">
            <CaseRowsTable
              rows={closedRows}
              showIncoming
              emptyHint="Закрытых дел нет."
            />
          </div>
        </details>
      )}
    </section>
  );
}
