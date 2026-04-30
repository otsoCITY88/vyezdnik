"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth-actions";

export type SidebarUser = {
  fullName: string;
  shortName: string | null;
  position: string | null;
  initials: string;
  isAdmin: boolean;
};

export type SidebarCounters = {
  inboxUnlinked: number;   // входящих писем без привязки к делу
  burningCases: number;    // дел с горящим дедлайном (≤3 дня)
};

export function Sidebar({ user, counters }: { user: SidebarUser; counters: SidebarCounters }) {
  const groups: Array<{ title: string; items: Array<{ href: string; label: string; badge?: string; badgeKind?: "amber" | "bordeaux" | "ghost" }> }> = [
    {
      title: "Работа",
      items: [
        { href: "/", label: "Сегодня" },
        {
          href: "/cases",
          label: "Дела",
          ...(counters.burningCases > 0
            ? { badge: String(counters.burningCases), badgeKind: "bordeaux" as const }
            : {}),
        },
        {
          href: "/inbox",
          label: "Входящие",
          ...(counters.inboxUnlinked > 0
            ? { badge: String(counters.inboxUnlinked), badgeKind: "amber" as const }
            : {}),
        },
        { href: "/outgoing", label: "Реестр исх." },
        { href: "/calendar", label: "Календарь" },
        { href: "/analytics", label: "Аналитика" },
      ],
    },
    {
      title: "Справочники",
      items: [
        { href: "/buildings", label: "МКД" },
        { href: "/organizations", label: "Контрагенты" },
        { href: "/contracts", label: "Договоры" },
        { href: "/users", label: "Пользователи" },
        { href: "/templates", label: "Шаблоны" },
      ],
    },
  ];

  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="border-r relative"
      style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)" }}
    >
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--line)" }}>
        <Link href="/" className="block">
          <div className="display text-[28px] leading-none tracking-tight">
            <span style={{ fontStyle: "normal", fontWeight: 600 }}>РКС</span>
            <span className="text-muted">·</span>
            <span style={{ fontStyle: "italic", fontWeight: 500 }}>Выезд</span>
          </div>
          <div className="micro-2 text-muted mt-2">Реестр обращений · МКД Мариуполь</div>
        </Link>
      </div>

      <div className="py-3">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="micro-2 text-muted px-5 pb-2 pt-3">{g.title}</div>
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${isActive(it.href) ? "active" : ""}`}
              >
                <span className="dot" />
                <span className="flex-1">{it.label}</span>
                {it.badge && (
                  <span className={`pill ${it.badgeKind || ""}`} style={{ padding: "1px 7px", fontSize: 10 }}>
                    {it.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-0 px-5" style={{ width: 248 }}>
        <div className="frame p-3 flex items-center gap-3">
          <div
            className="display text-[18px] w-9 h-9 grid place-items-center"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] truncate">{user.shortName || user.fullName}</div>
            <div className="micro-2 text-muted truncate">
              {user.isAdmin ? "Администратор" : (user.position || "—")}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-[14px] text-muted hover:text-ink"
              title="Выйти"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ⎋
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
