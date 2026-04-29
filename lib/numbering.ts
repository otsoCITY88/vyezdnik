// Автонумерация исходящих писем и дел.

import { prisma } from "./prisma";

export const OUTGOING_PREFIX = "02"; // префикс отдела претензионной работы

export async function nextOutgoingNumber(prefix: string = OUTGOING_PREFIX): Promise<string> {
  const counter = await prisma.outgoingNumberCounter.upsert({
    where: { prefix },
    create: { prefix, year: new Date().getFullYear(), current: 1 },
    update: { current: { increment: 1 } },
  });
  return formatOutgoing(prefix, counter.current);
}

export async function peekOutgoingNumber(prefix: string = OUTGOING_PREFIX): Promise<string> {
  const counter = await prisma.outgoingNumberCounter.findUnique({ where: { prefix } });
  const next = (counter?.current ?? 0) + 1;
  return formatOutgoing(prefix, next);
}

function formatOutgoing(prefix: string, n: number): string {
  return `${prefix}/${String(n).padStart(4, "0")}`;
}

/** «Д-2026-0042» — следующий номер дела на текущий год. */
export async function nextCaseNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const lastInYear = await prisma.case.findFirst({
    where: { caseNumber: { startsWith: `Д-${year}-` } },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });
  const nextN = lastInYear
    ? parseInt(lastInYear.caseNumber.split("-")[2], 10) + 1
    : 1;
  return `Д-${year}-${String(nextN).padStart(4, "0")}`;
}
