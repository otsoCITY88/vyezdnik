// Русифицированная 404 — заменяет дефолтную англоязычную страницу Next.js.

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "var(--paper)" }}>
      <div className="frame p-8 text-center" style={{ width: 460 }}>
        <div className="display text-[64px] leading-none mb-2">404</div>
        <div className="display text-[24px] leading-none mb-3">Страница не найдена</div>
        <div className="text-[14px] text-muted mb-5">
          Возможно, дело удалили или ссылка неверная.
        </div>
        <div className="flex gap-2 justify-center">
          <a href="/" className="btn bordeaux">На главную</a>
          <a href="/cases" className="btn ghost">К списку дел</a>
        </div>
      </div>
    </div>
  );
}
