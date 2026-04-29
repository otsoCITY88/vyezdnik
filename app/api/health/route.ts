// Healthcheck для Coolify / Docker — проверяет что приложение и БД живы.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "vyezdnik",
      ts: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "db_error",
    }, { status: 503 });
  }
}
