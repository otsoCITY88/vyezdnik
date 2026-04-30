// Сводные выборки для дашборда и списков.

import { prisma } from "./prisma";
import { daysFromToday, safeJSON } from "./format";
import { CaseState, STATE_LABELS, STATE_TONE } from "./workflow";

export interface CaseRow {
  id: string;
  caseNumber: string;
  buildingId: string;
  buildingShort: string;
  buildingFull: string;
  applicant: string;
  spoShort: string;
  state: CaseState;
  stateLabel: string;
  stateTone: typeof STATE_TONE[keyof typeof STATE_TONE];
  responsible: string;
  responsibleShort: string;
  nearestDeadline?: { iso: string; label: string; days: number | null };
  incomingNumber?: string;
}

export async function listCases(filter?: { responsibleEmail?: string; tone?: "amber" | "bordeaux" | "moss" }): Promise<CaseRow[]> {
  const cases = await prisma.case.findMany({
    include: {
      building: true,
      subcontractor: true,
      responsibleUser: true,
      incomingLetter: true,
    },
    orderBy: { caseNumber: "desc" },
  });

  const rows: CaseRow[] = cases.map((c) => {
    const state = c.state as CaseState;
    const tone = STATE_TONE[state] ?? "neutral";
    const deadlines = safeJSON<Record<string, string>>(c.deadlines, {});
    const deadlineEntries = Object.entries(deadlines).filter(([, v]) => Boolean(v));
    const nearest = deadlineEntries
      .map(([k, v]) => ({ iso: v, label: deadlineLabel(k), date: new Date(v) }))
      .filter((d) => !isNaN(d.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      buildingId: c.buildingId,
      buildingShort: c.building.shortAddress,
      buildingFull: c.building.fullAddress,
      applicant: c.incomingLetter?.applicantName || "—",
      spoShort: c.subcontractor.shortName,
      state,
      stateLabel: STATE_LABELS[state] ?? state,
      stateTone: tone,
      responsible: c.responsibleUser?.fullName || "—",
      responsibleShort: c.responsibleUser?.shortName || "—",
      incomingNumber: c.incomingLetter?.number,
      nearestDeadline: nearest
        ? { iso: nearest.iso, label: nearest.label, days: daysFromToday(nearest.iso) }
        : undefined,
    };
  });

  if (!filter) return rows;
  return rows.filter((r) => {
    if (filter.tone && r.stateTone !== filter.tone) return false;
    return true;
  });
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

// ─────────────────────────────────────────────────────────────────────
//  Файлы дела — единая агрегация всех файлов, привязанных к делу.
//  Используется в блоке «Все файлы дела» на /cases/[id] и в ZIP-выгрузке.
// ─────────────────────────────────────────────────────────────────────

export interface CaseFile {
  kind: "incoming" | "document" | "signature" | "edo" | "visit_photo";
  label: string;       // отображаемое имя
  relPath: string;     // путь относительно STORAGE_ROOT — для /api/files/download
  ownerId: string;     // id владельца (для истории версий)
}

export async function caseFiles(caseId: string): Promise<CaseFile[]> {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      incomingLetter: true,
      documents: { orderBy: { createdAt: "asc" } },
      visits: { orderBy: { visitDate: "asc" } },
    },
  });
  if (!c) return [];

  const root = (process.env.STORAGE_DIR || "/app/storage").replace(/\/+$/, "") + "/";
  const trim = (full: string | null | undefined): string => {
    if (!full) return "";
    if (full.startsWith(root)) return full.slice(root.length);
    // На всякий случай если путь с виндовыми слэшами или относительный
    return full.replace(/^[/\\]+/, "");
  };

  const out: CaseFile[] = [];

  if (c.incomingLetter?.attachedFile) {
    out.push({
      kind: "incoming",
      label: `Входящее ${c.incomingLetter.number}`,
      relPath: trim(c.incomingLetter.attachedFile),
      ownerId: c.incomingLetter.id,
    });
  }

  for (const d of c.documents) {
    if (d.renderedDocxPath) {
      const title = d.outgoingNumber || d.templateKind;
      out.push({
        kind: "document",
        label: `${title}${d.subject ? ` — ${d.subject}` : ""}`,
        relPath: trim(d.renderedDocxPath),
        ownerId: d.id,
      });
    }
    if (d.signaturePath) {
      out.push({
        kind: "signature",
        label: `Подпись к ${d.outgoingNumber || d.templateKind}`,
        relPath: trim(d.signaturePath),
        ownerId: d.id,
      });
    }
    if (d.edoPackagePath) {
      out.push({
        kind: "edo",
        label: `ЭДО-пакет ${d.outgoingNumber || d.templateKind}`,
        relPath: trim(d.edoPackagePath),
        ownerId: d.id,
      });
    }
  }

  for (const v of c.visits) {
    const photos = safeJSON<Array<{ path: string }>>(v.photos, []);
    photos.forEach((p, i) => {
      if (!p?.path) return;
      out.push({
        kind: "visit_photo",
        label: `Фото с выезда ${v.visitDate.toISOString().slice(0, 10)} #${i + 1}`,
        relPath: trim(p.path),
        ownerId: v.id,
      });
    });
  }

  return out.filter((f) => f.relPath);
}

/** Дашбордные виджеты */
export async function dashboardData() {
  const [allRows, incomingNoCase, todayVisits, weekPlannedVisits] = await Promise.all([
    listCases(),
    prisma.incomingLetter.findMany({
      where: { linkedCaseId: null },
      include: { fromOrganization: true, building: true },
      orderBy: { incomingDate: "desc" },
      take: 5,
    }),
    // Сегодня выезды (только запланированные на сегодня)
    prisma.visit.findMany({
      where: {
        status: "planned",
        visitDate: { gte: startOfToday(), lt: startOfTomorrow() },
      },
      include: { case: { include: { building: true } } },
      orderBy: { visitDate: "asc" },
    }),
    // На неделе вперёд — запланированные с завтра до конца недели+7
    prisma.visit.findMany({
      where: {
        status: "planned",
        visitDate: { gte: startOfTomorrow(), lt: inDays(8) },
      },
      include: { case: { include: { building: true, subcontractor: true } } },
      orderBy: { visitDate: "asc" },
    }),
  ]);

  const burning = allRows
    .filter((r) => r.nearestDeadline && (r.nearestDeadline.days ?? 999) <= 3)
    .sort((a, b) => (a.nearestDeadline!.days ?? 0) - (b.nearestDeadline!.days ?? 0));

  const replyToPpk = allRows.filter(
    (r) => r.state === "remedy_confirmed" || r.state === "reply_to_ppk_drafted",
  );

  return { allRows, burning, incomingNoCase, replyToPpk, todayVisits, weekPlannedVisits };
}

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function startOfTomorrow(): Date {
  const d = startOfToday(); d.setDate(d.getDate() + 1); return d;
}
function inDays(n: number): Date {
  const d = startOfToday(); d.setDate(d.getDate() + n); return d;
}

/** Завтрашние запланированные выезды — для дайджеста */
export async function tomorrowVisits() {
  const start = startOfTomorrow();
  const end = inDays(2);
  return prisma.visit.findMany({
    where: { status: "planned", visitDate: { gte: start, lt: end } },
    include: { case: { include: { building: true, subcontractor: true } } },
    orderBy: { visitDate: "asc" },
  });
}
