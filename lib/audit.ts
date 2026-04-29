// Аудит-лог: одна функция-обёртка для записи действия.
// Вызывается из API endpoints и server actions.

import { prisma } from "./prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";

export async function logAudit(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
}) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const h = await headers();
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ? JSON.stringify(input.payload) : null,
        ip: h.get("x-forwarded-for") || h.get("x-real-ip") || null,
        userAgent: h.get("user-agent") || null,
      },
    });
  } catch {
    // не падаем из-за аудита
  }
}
