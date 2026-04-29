import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { caseChat, isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { dateShort, safeJSON } from "@/lib/format";
import { STATE_LABELS } from "@/lib/workflow";

const Body = z.object({
  caseId: z.string(),
  threadId: z.string().optional(),
  question: z.string().min(1),
  userId: z.string().optional(),
});

async function buildContextSnapshot(caseId: string): Promise<string> {
  const c = await prisma.case.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      building: true, subcontractor: true, contract: true,
      events: { orderBy: { occurredAt: "asc" } },
      visits: { orderBy: { visitDate: "asc" } },
      documents: { orderBy: { outgoingDate: "asc" } },
      incomingLetter: true,
    },
  });

  const dl = safeJSON<Record<string, string>>(c.deadlines, {});
  const lines: string[] = [
    `# Дело ${c.caseNumber}`,
    `Объект: ${c.building.fullAddress}`,
    `Субподрядчик: ${c.subcontractor.fullName}`,
    `Состояние: ${STATE_LABELS[c.state as keyof typeof STATE_LABELS] || c.state}`,
    c.contract ? `Договор: № ${c.contract.number} от ${dateShort(c.contract.date)}` : "",
    c.incomingLetter ? `Входящее: ${c.incomingLetter.number} от ${dateShort(c.incomingLetter.incomingDate)} (${c.incomingLetter.applicantOrigin || "—"})` : "",
    c.incomingLetter?.applicantName ? `Заявитель: ${c.incomingLetter.applicantName}` : "",
    Object.keys(dl).length ? `Сроки: ${Object.entries(dl).map(([k, v]) => `${k}=${dateShort(v)}`).join("; ")}` : "",
    "",
    "## Хронология",
    ...c.events.map((e) => `${dateShort(e.occurredAt)} · [${e.kind}] ${e.title}${e.description ? ` — ${e.description}` : ""}`),
    "",
    "## Выезды",
    ...c.visits.map((v) => `${dateShort(v.visitDate)} · ${v.kind} · итог: ${v.result || "—"}${v.findings ? ` — ${v.findings}` : ""}`),
    "",
    "## Документы",
    ...c.documents.map((d) => `${dateShort(d.outgoingDate)} · ${d.outgoingNumber} · ${d.templateKind}${d.subject ? ` — ${d.subject}` : ""}${d.signedAt ? " ✓УКЭП" : ""}${d.edoStatus ? ` ЭДО=${d.edoStatus}` : ""}`),
  ].filter(Boolean);

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const { caseId, threadId, question, userId } = parsed.data;

  // 1) Найти/создать тред
  let thread = threadId
    ? await prisma.aiThread.findUnique({ where: { id: threadId }, include: { messages: { orderBy: { createdAt: "asc" } } } })
    : null;

  if (!thread) {
    // создаём тред (если нет userId — берём первого юзера, для прототипа)
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "no_user" }, { status: 400 });
    const created = await prisma.aiThread.create({
      data: { userId: user.id, caseId, title: question.slice(0, 80) },
    });
    thread = { ...created, messages: [] };
  }

  // 2) Снимок контекста дела (стабильный — кэшируется)
  const snapshot = await buildContextSnapshot(caseId);

  // 3) История диалога
  const history = thread.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const answer = await caseChat({ contextSnapshot: snapshot, history, question });

    // 4) Сохраняем сообщения
    await prisma.aiMessage.create({
      data: { threadId: thread.id, role: "user", content: question },
    });
    await prisma.aiMessage.create({
      data: { threadId: thread.id, role: "assistant", content: answer },
    });

    return NextResponse.json({ ok: true, answer, threadId: thread.id });
  } catch (e: unknown) {
    return NextResponse.json({
      error: "ai_failed",
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// GET /api/ai/chat?caseId=... — список тредов
export async function GET(req: NextRequest) {
  const caseId = new URL(req.url).searchParams.get("caseId");
  if (!caseId) return NextResponse.json({ error: "no_case_id" }, { status: 400 });

  const threads = await prisma.aiThread.findMany({
    where: { caseId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(threads);
}
