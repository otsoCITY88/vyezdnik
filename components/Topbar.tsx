"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Сегодня",
  "/cases": "Дела",
  "/inbox": "Входящие",
  "/outgoing": "Реестр исходящих",
  "/buildings": "Справочники › МКД",
  "/organizations": "Справочники › Контрагенты",
  "/templates": "Справочники › Шаблоны",
};

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? (pathname.startsWith("/cases/") ? "Дела › карточка" : pathname);

  return (
    <div
      className="sticky top-0 z-20 backdrop-blur"
      style={{ background: "rgba(247,243,234,.85)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center px-8 py-3 gap-4">
        <div className="micro text-muted">
          РКС·Выезд / <span style={{ color: "var(--ink)" }}>{title}</span>
        </div>
        <div className="flex-1" />
        <button
          className="frame px-3 py-1.5 flex items-center gap-2 text-[13px] text-muted hover:bg-paper2"
          style={{ minWidth: 320 }}
          onClick={() => {
            // программный триггер ⌘K через keydown event
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <span>Найти дело, объект, исх.№…</span>
          <span className="flex-1" />
          <span className="kbd">⌘ K</span>
        </button>
        <Link href="/inbox" className="btn ghost">Загрузить входящее</Link>
        <Link href="/cases/new" className="btn">＋ Новое дело</Link>
      </div>
    </div>
  );
}
