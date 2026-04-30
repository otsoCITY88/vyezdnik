import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncImap } from "@/lib/imap-sync";

export async function POST() {
  // Запрещаем анонимный вызов: IMAP-логин/пароль и доступ к почте — приватные.
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const r = await syncImap();
  return NextResponse.json(r, { status: 200 });
}
