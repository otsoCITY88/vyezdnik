// Утренний дайджест — собирает «горящие сроки» и отправляет push + telegram.

import { dashboardData, tomorrowVisits } from "./queries";
import { dateShort } from "./format";
import { pushToAll } from "./push";
import { tgNotify } from "./telegram";

export async function runDailyDigest() {
  const [{ burning, incomingNoCase, replyToPpk, todayVisits }, tomorrow] = await Promise.all([
    dashboardData(),
    tomorrowVisits(),
  ]);

  const headline =
    `🔔 РКС·Выезд · дайджест на ${dateShort(new Date())}: ${burning.length} горящих, ${incomingNoCase.length} входящих, ${replyToPpk.length} к ответу в ППК, ${todayVisits.length} выездов сегодня, ${tomorrow.length} завтра`;

  const detailLines = [
    headline,
    "",
    burning.length ? "⚠ Горящие сроки:" : "",
    ...burning.slice(0, 5).map((r) => `  · ${r.caseNumber} ${r.buildingShort} — ${r.nearestDeadline?.iso ? dateShort(r.nearestDeadline.iso) : "—"}`),
    todayVisits.length ? "" : "",
    todayVisits.length ? "🚐 Сегодня выезды:" : "",
    ...todayVisits.slice(0, 5).map((v) => `  · ${v.case.building.shortAddress} (${v.case.caseNumber})`),
    tomorrow.length ? "" : "",
    tomorrow.length ? "🗓 Завтра выезды:" : "",
    ...tomorrow.slice(0, 5).map((v) => `  · ${v.case.building.shortAddress} · ${v.case.subcontractor.shortName}`),
    incomingNoCase.length ? "" : "",
    incomingNoCase.length ? "📥 Без дела:" : "",
    ...incomingNoCase.slice(0, 5).map((i) => `  · ${i.number} от ${dateShort(i.incomingDate)}`),
  ].filter(Boolean);

  const text = detailLines.join("\n");

  await Promise.all([
    pushToAll({ title: "РКС·Выезд · сводка", body: headline, tag: "digest" }),
    tgNotify(text),
  ]);

  return { ok: true, headline };
}
