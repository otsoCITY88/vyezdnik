// Корневой layout — только html/body и общий шрифт + meta.
// Сайдбар/топбар вынесены в app/(app)/layout.tsx, чтобы login (вне группы) был чистый.

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "РКС·Выезд",
  description: "Реестр обращений и претензионная работа · ООО «РКС-НР» Мариуполь",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,200..900,0..100,0..1;1,9..144,200..900,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300..700&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#14181F" />
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
