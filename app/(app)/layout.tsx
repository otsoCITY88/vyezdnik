// Layout для всех страниц внутри приложения — с сайдбаром и топбаром.
// Логин рендерится из app/login/page.tsx и НЕ попадает сюда (другая ветка route tree).
//
// Защита: если нет валидной сессии — редирект на /login.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar, type SidebarUser, type SidebarCounters } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { daysFromToday, safeJSON } from "@/lib/format";

function makeInitials(fullName: string, shortName?: string | null): string {
  // Если есть shortName в формате "И.О. Фамилия" — берём первую букву
  // первой части и первую букву последнего слова.
  if (shortName) {
    const parts = shortName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0].replace(/[^\p{L}]/gu, "")[0] || "";
      const last = parts[parts.length - 1][0] || "";
      return (first + last).toUpperCase();
    }
  }
  // Иначе — первые буквы первых двух слов fullName
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return "?";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser) {
    // Сессия есть, но юзер удалён — выкидываем на логин.
    redirect("/login");
  }

  const sidebarUser: SidebarUser = {
    fullName: dbUser.fullName,
    shortName: dbUser.shortName,
    position: dbUser.position,
    initials: makeInitials(dbUser.fullName, dbUser.shortName),
    isAdmin: dbUser.isAdmin,
  };

  // Счётчики для бейджей в сайдбаре — реальные значения из БД, не захардкожены.
  const [inboxUnlinked, openCases] = await Promise.all([
    prisma.incomingLetter.count({ where: { linkedCaseId: null } }),
    prisma.case.findMany({
      where: { state: { not: "closed" } },
      select: { deadlines: true },
    }),
  ]);

  // Горящие дела — те, у которых ближайший дедлайн ≤ 3 дня (включая просроченные).
  const burningCases = openCases.filter((c) => {
    const deadlines = safeJSON<Record<string, string>>(c.deadlines, {});
    const days = Object.values(deadlines)
      .filter(Boolean)
      .map((iso) => daysFromToday(iso))
      .filter((d): d is number => d !== null);
    if (!days.length) return false;
    return Math.min(...days) <= 3;
  }).length;

  const counters: SidebarCounters = { inboxUnlinked, burningCases };

  return (
    <>
      <div className="grid min-h-screen" style={{ gridTemplateColumns: "248px 1fr" }}>
        <Sidebar user={sidebarUser} counters={counters} />
        <main className="relative">
          <Topbar />
          {children}
        </main>
      </div>
      <CommandPalette />
      <PwaBootstrap />
    </>
  );
}
