// Layout для всех страниц внутри приложения — с сайдбаром и топбаром.
// Логин рендерится из app/login/page.tsx и НЕ попадает сюда (другая ветка route tree).

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { PwaBootstrap } from "@/components/PwaBootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid min-h-screen" style={{ gridTemplateColumns: "248px 1fr" }}>
        <Sidebar />
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
