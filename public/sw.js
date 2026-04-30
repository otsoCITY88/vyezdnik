// SELF-DESTRUCT SERVICE WORKER
//
// Старые версии этого SW агрессивно кешировали HTML-страницы (cache-first
// для навигаций), из-за чего после деплоя у пользователей оставались
// битые страницы — закешированный HTML тянул протухшие JS-чанки и
// рендерился пустым / с ERR_FAILED.
//
// Этот файл специально пустой по логике — задача только одна:
//   1) при install/activate — удалить ВСЕ старые кеши
//   2) разрегистрировать сам SW
//   3) сказать клиентам перезагрузиться, чтобы они начали ходить напрямую в сеть
//
// Когда понадобится реальный PWA с offline/push — переписать с нуля,
// network-first для навигаций.

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Чистим всё, что было закешировано предыдущими версиями SW.
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    // Перехватываем существующих клиентов…
    await self.clients.claim();
    // …разрегистрируем сами себя…
    await self.registration.unregister();
    // …и просим клиентов перезагрузить страницу — без кеша SW.
    const clients = await self.clients.matchAll({ type: "window" });
    for (const c of clients) {
      try { c.navigate(c.url); } catch { /* ignore */ }
    }
  })());
});

// Никаких fetch-обработчиков. Все запросы идут напрямую в сеть.
