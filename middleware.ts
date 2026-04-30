// Middleware — единая точка контроля доступа.
//
// Раньше /api/* был полностью исключён из проверки auth, и каждый роут
// должен был сам вызывать auth(). 30+ роутов это делать забывали — любой
// неавторизованный посетитель мог создать дело, удалить контакт и т.д.
//
// Теперь /api/* тоже проходит через middleware. Публичные исключения:
// 1) /api/auth/* — внутренние эндпоинты NextAuth (signin/callback/csrf)
// 2) /api/health — для Coolify healthcheck (без сессии)
// 3) /api/notifications/digest — внутри сам проверяет cron-secret
//
// UI-страницы: всё, кроме /login, требует валидной сессии — иначе 302 на /login.

import { auth } from "@/auth";
import { NextResponse } from "next/server";

// UI-страницы, доступные без логина.
const PUBLIC_ROUTES = ["/login"];

// Префиксы статики, которые middleware не должен трогать.
const STATIC_PREFIXES = ["/_next", "/favicon", "/manifest", "/sw.js", "/icons"];

// /api/* эндпоинты, доступные без сессии.
// Ничего не добавляем сюда без необходимости — каждый такой роут =
// потенциальная дырка.
const PUBLIC_API_PREFIXES = [
  "/api/auth/",                  // NextAuth внутренние URL
  "/api/health",                 // Coolify healthcheck
  "/api/notifications/digest",   // защищён x-cron-secret внутри роута
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Статика — всегда пропускаем.
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Публичные UI-страницы — пропускаем.
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Публичные API-эндпоинты — пропускаем.
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Всё остальное требует сессии.
  if (!req.auth) {
    // Для API возвращаем 401 JSON — фронту удобнее обработать.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // Для UI — редирект на /login с возвратом.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

// matcher больше не исключает /api/ — middleware ходит и туда.
// Но _next/static, image и favicon отсекаем по производительности.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
