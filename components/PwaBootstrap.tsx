"use client";

// PwaBootstrap — раньше регистрировал service worker для PWA-режима.
// Сейчас отключён: SW кешировал HTML и после деплоев пользователи получали
// битые страницы (старый HTML + новые JS-чанки = ERR_FAILED / пустой экран).
//
// Вместо регистрации делаем АГРЕССИВНУЮ ОЧИСТКУ:
//   • разрегистрируем все ранее установленные SW (включая старые версии нашего)
//   • удаляем все Cache Storage кеши
//
// Это идемпотентно и безопасно. Когда снова понадобится PWA с push/offline —
// переписать sw.js под network-first и убрать unregister-логику отсюда.

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    // 1. Снимаем регистрацию всех Service Worker'ов
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => false))))
        .catch(() => { /* ignore */ });
    }

    // 2. Чистим Cache Storage целиком
    if (typeof window !== "undefined" && "caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k).catch(() => false))))
        .catch(() => { /* ignore */ });
    }
  }, []);

  return null;
}

// Стаб для кнопки включения push-уведомлений — чтобы импорты не падали.
// Реальная логика вернётся когда переделаем SW под network-first.
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  return { ok: false, reason: "pwa_temporarily_disabled" };
}
