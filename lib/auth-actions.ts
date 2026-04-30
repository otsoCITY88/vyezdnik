// Серверные actions для авторизации — вызываются из клиентских компонентов
// через <form action={...}>. Без этого signOut открывает дефолтную страницу
// подтверждения Auth.js, что выглядит странно на русском интерфейсе.

"use server";

import { signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
