import Link from "next/link";
import { dashboardData } from "@/lib/queries";
import { dateHeadline, weekday, relativeDay, dateCompact } from "@/lib/format";
import { peekOutgoingNumber } from "@/lib/numbering";
import { Pill } from "@/components/Pill";
import { CaseRowsTable } from "@/components/CaseRowsTable";

export const dynamic = "force-dynamic";

export default async function Page() {
  const today = new Date();
  const { allRows, burning, incomingNoCase, replyToPpk, todayVisits, weekPlannedVisits } = await dashboardData();
  const nextNumber = await peekOutgoingNumber();

  return (
    <section className="px-8 pt-8 pb-16">
      {/* heading */}
      <div className="flex items-end justify-between">
        <div className="rise">
          <div className="micro text-muted">{weekday(today)}</div>
          <h1 className="display mt-2 text-[68px] leading-[0.95] tracking-tight">
            {dateHeadline(today).split(" ").map((p, i) =>
              i === 1 ? <span key={i} style={{ fontStyle: "italic", fontWeight: 300 }}>{" " + p + " "}</span> : <span key={i}>{p}</span>
            )}
          </h1>
          <p className="read mt-3 text-[18px] max-w-[60ch]" style={{ color: "var(--ink-2)" }}>
            У вас <span className="text-bordeaux font-semibold">{burning.length} горящих дел</span>,{" "}
            {incomingNoCase.length} непривязанных входящих
            {todayVisits.length > 0 && <>, {todayVisits.length} комиссия сегодня</>}.
          </p>
        </div>
        <div className="text-right rise rise-1">
          <div className="micro text-muted">Реестр исх. · {today.toLocaleString("ru-RU", { month: "long" })}</div>
          <div className="display text-[40px] leading-none mt-2 mono">{nextNumber.replace("/", "/")}</div>
          <div className="micro-2 text-muted mt-1">след. номер автоматически</div>
        </div>
      </div>

      <div className="ruler my-8" />

      {/* widgets */}
      <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(5, 1fr)", background: "var(--line)" }}>
        <Widget
          title="Горящие сроки"
          count={burning.length}
          tone="bordeaux"
          items={burning.slice(0, 4).map((r) => ({
            left: `${r.caseNumber} · ${r.buildingShort}`,
            right: r.nearestDeadline ? relativeDay(r.nearestDeadline.iso) : "",
            href: `/cases/${r.id}`,
            tone: (r.nearestDeadline?.days ?? 0) < 0 ? "bordeaux" : "amber",
          }))}
          ctaLabel="Открыть реестр →"
          ctaHref="/cases?filter=burning"
        />

        <Widget
          title="Входящие без дела"
          count={incomingNoCase.length}
          tone="amber"
          items={incomingNoCase.slice(0, 4).map((i) => ({
            left: i.number,
            right: dateCompact(i.incomingDate),
            sub: `${i.applicantName || "—"} · ${i.building?.shortAddress || "—"}`,
            href: `/inbox#${i.id}`,
            tone: "neutral",
            mono: true,
          }))}
          ctaLabel="Завести дело →"
          ctaHref="/inbox"
        />

        <Widget
          title="К ответу в ППК"
          count={replyToPpk.length}
          tone="moss"
          items={replyToPpk.slice(0, 4).map((r) => ({
            left: `${r.caseNumber} · ${r.buildingShort}`,
            right: "готово",
            href: `/cases/${r.id}`,
            tone: "moss",
          }))}
          ctaLabel="Сгенерировать пачкой →"
          ctaHref="/outgoing"
        />

        <Widget
          title="Сегодня выезды"
          count={todayVisits.length}
          tone="indigo"
          items={todayVisits.slice(0, 3).map((v) => ({
            left: `${v.case.building.shortAddress}`,
            right: v.kind === "initial" ? "первичный" : v.kind === "repeat" ? "повторный" : "финальный",
            sub: `Комиссия: ${(v.commissionMembers ? "согласно списку" : "—")}`,
            href: `/cases/${v.caseId}`,
            tone: "indigo",
          }))}
          ctaLabel={todayVisits.length === 0 ? "Нет на сегодня" : "Открыть карточку"}
          ctaHref={todayVisits[0] ? `/cases/${todayVisits[0].caseId}` : "/cases"}
        />

        <Widget
          title="На неделе выезды"
          count={weekPlannedVisits.length}
          tone="moss"
          items={weekPlannedVisits.slice(0, 4).map((v) => ({
            left: v.case.building.shortAddress,
            right: dayLabel(v.visitDate),
            sub: v.case.subcontractor.shortName,
            href: `/cases/${v.caseId}`,
            tone: "moss",
          }))}
          ctaLabel={weekPlannedVisits.length === 0 ? "Не запланировано" : "Открыть календарь →"}
          ctaHref="/calendar"
        />
      </div>

      {/* recent cases */}
      <div className="mt-12 rise rise-5">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="micro text-muted">Недавние дела</div>
            <h2 className="display text-[28px] mt-1">В работе сейчас</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/cases" className="pill ghost">Все · {allRows.length}</Link>
            <Link href="/cases?filter=burning" className="pill ghost">Просрочено · {burning.length}</Link>
            <Link href="/cases?filter=reply" className="pill ghost">К ответу · {replyToPpk.length}</Link>
          </div>
        </div>

        <div className="frame">
          <CaseRowsTable rows={allRows.slice(0, 8)} />
        </div>
      </div>
    </section>
  );
}

function Widget({
  title, count, tone, items, ctaLabel, ctaHref,
}: {
  title: string; count: number; tone: "amber" | "bordeaux" | "moss" | "indigo";
  items: Array<{ left: string; right: string; sub?: string; href: string; tone?: "amber" | "bordeaux" | "moss" | "neutral" | "indigo"; mono?: boolean }>;
  ctaLabel: string; ctaHref: string;
}) {
  const icon = { amber: "📥", bordeaux: "⏱", moss: "✉", indigo: "🛣" }[tone];
  return (
    <div className="bg-paper p-5 rise">
      <div className="flex items-start justify-between">
        <div className="micro text-muted">{title}</div>
        <Pill tone={tone}>{icon} {count}</Pill>
      </div>
      <div className="display text-[44px] leading-none mt-3">{count}</div>
      <div className="ruler my-4" />
      {items.length === 0 ? (
        <div className="text-[13px] text-muted">пусто</div>
      ) : (
        <ul className="space-y-2.5 text-[13px]">
          {items.map((it, i) => (
            <li key={i}>
              <Link href={it.href} className="grid gap-x-3" style={{ gridTemplateColumns: "1fr auto" }}>
                <span className={`truncate ${it.mono ? "mono" : ""}`}>{it.left}</span>
                <span className={`mono ${it.tone === "bordeaux" ? "text-bordeaux" : it.tone === "amber" ? "text-amber" : it.tone === "moss" ? "text-moss" : "text-muted"}`}>
                  {it.right}
                </span>
                {it.sub && <span className="text-muted text-[12px] col-span-2 truncate">{it.sub}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={ctaHref} className="btn ghost sm mt-4">{ctaLabel}</Link>
    </div>
  );
}

function dayLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  if (days < 7) return `+${days}д`;
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}
