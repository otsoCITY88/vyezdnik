// Cron-задачи. Запускается одним хуком из server-side (next.config / instrumentation).

import cron from "node-cron";
import { runDailyDigest } from "./digest";

let _started = false;

export function startCron() {
  if (_started) return;
  const schedule = process.env.CRON_DAILY_DIGEST || "0 9 * * *";
  if (!cron.validate(schedule)) {
    // eslint-disable-next-line no-console
    console.warn(`[cron] invalid CRON_DAILY_DIGEST="${schedule}", skipping`);
    return;
  }
  cron.schedule(schedule, async () => {
    try {
      const r = await runDailyDigest();
      // eslint-disable-next-line no-console
      console.log("[cron] daily digest:", r);
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error("[cron] daily digest error:", e);
    }
  });
  _started = true;
  // eslint-disable-next-line no-console
  console.log(`[cron] daily digest scheduled at "${schedule}"`);
}
