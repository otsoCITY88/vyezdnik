import webpush from "web-push";
import { prisma } from "./prisma";

let _ready = false;
function configure() {
  if (_ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:mail@rks-nr.ru";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subj, pub, priv);
  _ready = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function pushToUser(userId: string, payload: PushPayload) {
  if (!configure()) return { ok: false, reason: "vapid_not_configured" as const };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(payload),
    )),
  );
  // Удаляем мёртвые подписки
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: subs[i].id } }).catch(() => {});
      }
    }
  }
  return { ok: true, sent: results.filter((r) => r.status === "fulfilled").length };
}

export async function pushToAll(payload: PushPayload) {
  const users = await prisma.user.findMany({ select: { id: true } });
  let sent = 0;
  for (const u of users) {
    const r = await pushToUser(u.id, payload);
    if (r.ok && r.sent) sent += r.sent;
  }
  return { sent };
}
