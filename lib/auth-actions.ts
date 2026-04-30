// Серверные actions для авторизации — вызываются из клиентских компонентов
// через <form action={...}>.
//
// Почему НЕ полагаемся на signOut({ redirectTo }):
// В Auth.js v5 при вызове из server action redirect внутри signOut
// иногда не срабатывает — браузер получает пустой ответ и зависает на белой
// странице. Поэтому делаем в два шага:
//   1) signOut({ redirect: false }) — гарантированно очищает session-cookie
//   2) redirect("/login") — явный Next.js redirect, точно сработает.

"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
