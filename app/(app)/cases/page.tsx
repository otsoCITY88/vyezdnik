import Link from "next/link";
import { listCases } from "@/lib/queries";
import { CaseRowsTable } from "@/components/CaseRowsTable";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Все", tone: undefined as undefined | "amber" | "bordeaux" | "moss" },
  // «Горящие» = ближайший дедлайн ≤ 3 дня (включая просроченные).
  // Тот же критерий, что и в дашборде и в счётчике сайдбара.
  { key: "burning", label: "Горящие", tone: "bordeaux" as const },
  { key: "in_work", label: "В работе у СПО", tone: "amber" as const },
  { key: "reply", label: "К ответу в ППК", tone: "moss" as const },
];

const isBurning = (days: number | null | undefined) =>
  days != null && days <= 3;

export default async function CasesPage(
  { searchParams }: { searchParams: Promise<{ filter?: string }> },
) {
  const params = await searchParams;
  const filter = params?.filter || "all";
  const allRows = await listCases();
  const rows = filter === "all"
    ? allRows
    : filter === "burning"
      ? allRows.filter((r) => isBurning(r.nearestDeadline?.days))
      : filter === "in_work"
        ? allRows.filter((r) => r.stateTone === "amber")
        : filter === "reply"
          ? allRows.filter((r) => r.stateTone === "moss")
          : allRows;

  const counts = {
    all: allRows.length,
    burning: allRows.filter((r) => isBurning(r.nearestDeadline?.days)).length,
    in_work: allRows.filter((r) => r.stateTone === "amber").length,
    reply: allRows.filter((r) => r.stateTone === "moss").length,
  } as Record<string, number>;

  const emptyHints: Record<string, string> = {
    all: "Создайте первое дело из входящего письма или вручную.",
    burning: "Сейчас нет дел с ближайшим дедлайном — порядок.",
    in_work: "Нет дел в статусе ожидания ответа от СПО.",
    reply: "Нет дел, готовых к отправке ответа в ППК.",
  };

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Реестр</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Дела</h1>
          <p className="read mt-2 text-[16px] text-muted">
            {counts.all} активных, {counts.burning} горящих, {counts.reply} к ответу в ППК
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/cases/export.csv" className="btn ghost">↓ Экспорт .csv</a>
          <Link href="/cases/new" className="btn">＋ Новое дело</Link>
        </div>
      </div>

      <div className="ruler my-7" />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="micro text-muted mr-2">Фильтр:</span>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Link
              key={f.key}
              href={`/cases?filter=${f.key}`}
              className={`pill ${active ? "solid" : f.tone || ""}`}
            >
              {f.label} · {counts[f.key] ?? 0}
            </Link>
          );
        })}
        <span className="flex-1" />
        <span className="pill ghost">Сортировка: № ↓</span>
      </div>

      <div className="frame">
        <CaseRowsTable rows={rows} emptyHint={emptyHints[filter] || emptyHints.all} />
      </div>
    </section>
  );
}
