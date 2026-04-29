import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  responseNumber: z.string().optional().or(z.literal("")),
  responseDate: z.string(),
  resolution: z.enum(["accepted", "promised", "refused"]),
  notes: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await ctx.params;
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const d = parsed.data;

  await prisma.caseEvent.create({
    data: {
      caseId,
      occurredAt: new Date(d.responseDate),
      kind: "spo_response",
      title: `Получен ответ от СПО${d.responseNumber ? ` · № ${d.responseNumber}` : ""}`,
      description: [
        d.resolution === "accepted"  ? "Подрядчик принял замечания и приступает к устранению."
        : d.resolution === "promised" ? "Подрядчик предоставил график устранения."
        : /* refused */                "Подрядчик отказался / уклоняется.",
        d.notes,
      ].filter(Boolean).join(" "),
      payload: JSON.stringify({ resolution: d.resolution }),
    },
  });

  // Если СПО принял/обещал — переводим в awaiting_remedy
  if (d.resolution === "accepted" || d.resolution === "promised") {
    await prisma.case.update({ where: { id: caseId }, data: { state: "awaiting_remedy" } });
  }
  // Если отказ — переходим в spo_no_response (для эскалации)
  if (d.resolution === "refused") {
    await prisma.case.update({ where: { id: caseId }, data: { state: "spo_no_response" } });
  }

  return NextResponse.json({ ok: true });
}
