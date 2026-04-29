"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const isDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isDev) {
      // в dev — наоборот, выгоняем все SW и чистим кеши, чтобы изменения подхватывались сразу
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {})));
      }
      return;
    }

    // production — регистрируем SW, проверяем обновления
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => { reg.update().catch(() => {}); })
      .catch(() => {});
  }, []);
  return null;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false, reason: "unsupported" };
  const reg = await navigator.serviceWorker.ready;
  const meta = await fetch("/api/notifications/subscribe").then((r) => r.json());
  if (!meta.publicKey) return { ok: false, reason: "vapid_not_configured" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "permission_denied" };

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(meta.publicKey),
  });

  await fetch("/api/notifications/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return { ok: true };
}
