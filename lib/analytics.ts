// Сводки для дашборда аналитики.

import { prisma } from "./prisma";

export interface SpoSlaRow {
  spoShort: string;
  totalCases: number;
  closedCases: number;
  avgDaysToClose: number | null;
  burningNow: number;
}

export interface MonthlyCount { month: string; count: number }

export async function spoSla(): Promise<SpoSlaRow[]> {
  const subs = await prisma.organization.findMany({
    where: { kind: "subcontractor" },
    include: { casesAsSubco: true },
  });
  return subs.map((o) => {
    const closed = o.casesAsSubco.filter((c) => c.closedAt);
    const days = closed
      .map((c) => Math.round((c.closedAt!.getTime() - c.createdAt.getTime()) / 86400000))
      .filter((d) => d >= 0);
    const avg = days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
    const burningNow = o.casesAsSubco.filter((c) => {
      try {
        const dl = c.deadlines ? JSON.parse(c.deadlines) as Record<string, string> : {};
        const ts = Object.values(dl).map((v) => new Date(v).getTime());
        return ts.some((t) => t < Date.now()) && !c.closedAt;
      } catch { return false; }
    }).length;
    return {
      spoShort: o.shortName,
      totalCases: o.casesAsSubco.length,
      closedCases: closed.length,
      avgDaysToClose: avg,
      burningNow,
    };
  }).filter((r) => r.totalCases > 0).sort((a, b) => b.totalCases - a.totalCases);
}

export async function casesByMonth(): Promise<MonthlyCount[]> {
  const all = await prisma.case.findMany({ select: { createdAt: true } });
  const map = new Map<string, number>();
  for (const c of all) {
    const ym = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
    map.set(ym, (map.get(ym) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
}

export async function topBuildings(n = 10): Promise<Array<{ address: string; cases: number }>> {
  const buildings = await prisma.building.findMany({
    include: { _count: { select: { cases: true } } },
  });
  return buildings
    .map((b) => ({ address: b.fullAddress, cases: b._count.cases }))
    .filter((x) => x.cases > 0)
    .sort((a, b) => b.cases - a.cases)
    .slice(0, n);
}

export async function workloadByUser() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { cases: true } }, cases: { where: { closedAt: null } } },
  });
  return users.map((u) => ({
    name: u.shortName || u.fullName,
    total: u._count.cases,
    open: u.cases.length,
  })).filter((u) => u.total > 0);
}

export async function templateUsage() {
  const docs = await prisma.document.findMany({ select: { templateKind: true } });
  const map = new Map<string, number>();
  for (const d of docs) map.set(d.templateKind, (map.get(d.templateKind) || 0) + 1);
  return Array.from(map.entries()).map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
}
