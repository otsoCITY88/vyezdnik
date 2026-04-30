"use client";

// Глобальный обработчик ошибок Next.js — показывает русифицированную страницу
// вместо дефолтной англоязычной. Срабатывает при необработанных исключениях
// в любом server/client компоненте.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "var(--paper)" }}>
      <div className="frame p-8 text-center" style={{ width: 460 }}>
        <div className="display text-[36px] leading-none mb-3">Что-то пошло не так</div>
        <div className="text-[14px] text-muted mb-5">
          Произошла внутренняя ошибка. Попробуйте обновить страницу или вернуться на главную.
        </div>
        {error.digest && (
          <div className="mono text-[11px] text-muted mb-4">код: {error.digest}</div>
        )}
        <div className="flex gap-2 justify-center">
          <button className="btn ghost" onClick={() => reset()}>Повторить</button>
          <a href="/" className="btn bordeaux">На главную</a>
        </div>
      </div>
    </div>
  );
}
