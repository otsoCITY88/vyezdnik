import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { runDailyDigest } from "@/lib/digest";

// Разрешено: 1) залогиненному пользователю (ручной запуск из UI),
// 2) внешнему крону с заголовком x-cron-secret = process.env.CRON_SECRET.
export async function POST() {
  const session = await auth();
  const isUser = Boolean(session?.user?.email);

  let isCron = false;
  if (process.env.CRON_SECRET) {
    const h = await headers();
    isCron = h.get("x-cron-secret") === process.env.CRON_SECRET;
  }

  if (!isUser && !isCron) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const r = await runDailyDigest();
  return NextResponse.json(r);
}
