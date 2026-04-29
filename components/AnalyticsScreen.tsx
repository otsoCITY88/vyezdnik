"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Pill } from "./Pill";

export interface Props {
  spoSla: Array<{ spoShort: string; totalCases: number; closedCases: number; avgDaysToClose: number | null; burningNow: number }>;
  byMonth: Array<{ month: string; count: number }>;
  topBuildings: Array<{ address: string; cases: number }>;
  workload: Array<{ name: string; total: number; open: number }>;
  templates: Array<{ kind: string; count: number }>;
}

const COLORS = ["#14181F", "#6B1F2A", "#B26314", "#1F2A6B", "#4E5C39", "#7E776A"];

export function AnalyticsScreen({ spoSla, byMonth, topBuildings, workload, templates }: Props) {
  return (
    <section className="px-8 pt-8 pb-16">
      <div>
        <div className="micro text-muted">Сводка</div>
        <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Аналитика</h1>
        <p className="read mt-2 text-[16px] text-muted">SLA по СПО, нагрузка, динамика, проблемные адреса</p>
      </div>

      <div className="ruler my-7" />

      <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* SPO SLA */}
        <div className="frame p-5">
          <div className="micro text-muted">SLA по субподрядчикам</div>
          <h3 className="display text-[20px] mt-1 mb-3">Среднее время закрытия (дни)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={spoSla} margin={{ left: 0, right: 10, top: 10, bottom: 30 }}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="spoShort" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgDaysToClose" name="дней до закрытия">
                  {spoSla.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="editorial mt-4 text-[12.5px]">
            <thead>
              <tr><th>СПО</th><th>Всего</th><th>Закрыто</th><th>Avg, дн.</th><th>Просрочка</th></tr>
            </thead>
            <tbody>
              {spoSla.map((r) => (
                <tr key={r.spoShort} className="flat">
                  <td>{r.spoShort}</td>
                  <td className="mono">{r.totalCases}</td>
                  <td className="mono">{r.closedCases}</td>
                  <td className="mono">{r.avgDaysToClose ?? "—"}</td>
                  <td>{r.burningNow > 0 ? <Pill tone="bordeaux">{r.burningNow}</Pill> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Динамика */}
        <div className="frame p-5">
          <div className="micro text-muted">Динамика</div>
          <h3 className="display text-[20px] mt-1 mb-3">Заведено дел по месяцам</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={byMonth} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line dataKey="count" stroke="#6B1F2A" strokeWidth={2} dot={{ r: 4, fill: "#6B1F2A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Топ адресов */}
        <div className="frame p-5">
          <div className="micro text-muted">Хит-лист</div>
          <h3 className="display text-[20px] mt-1 mb-3">Адреса с наибольшим числом дел</h3>
          <table className="editorial text-[13px]">
            <thead><tr><th>Адрес</th><th>Дел</th></tr></thead>
            <tbody>
              {topBuildings.map((b) => (
                <tr key={b.address} className="flat">
                  <td>{b.address}</td>
                  <td><Pill tone="bordeaux">{b.cases}</Pill></td>
                </tr>
              ))}
              {topBuildings.length === 0 && <tr><td colSpan={2} className="text-muted text-center p-4">данных нет</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Нагрузка */}
        <div className="frame p-5">
          <div className="micro text-muted">Команда</div>
          <h3 className="display text-[20px] mt-1 mb-3">Нагрузка по специалистам</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={workload} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="open" name="открыто" fill="#B26314" />
                <Bar dataKey="total" name="всего" fill="#7E776A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Использование шаблонов */}
        <div className="frame p-5" style={{ gridColumn: "span 2" }}>
          <div className="micro text-muted">Шаблоны</div>
          <h3 className="display text-[20px] mt-1 mb-3">Сгенерировано документов по типам</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={templates}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="kind" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1F2A6B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
