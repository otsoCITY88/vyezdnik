import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextCaseNumber } from "@/lib/numbering";

const Body = z.object({
  incomingId: z.string(),
  buildingId: z.string(),
  subcontractorId: z.string(),
  responsibleUserId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const data = parsed.data;

  const incoming = await prisma.incomingLetter.findUnique({ where: { id: data.incomingId } });
  if (!incoming) return NextResponse.json({ error: "incoming_not_found" }, { status: 404 });
  if (incoming.linkedCaseId) return NextResponse.json({ error: "incoming_already_linked" }, { status: 409 });

  const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
  if (!building) return NextResponse.json({ error: "building_not_found" }, { status: 404 });

  const caseNumber = await nextCaseNumber();

  const created = await prisma.case.create({
    data: {
      caseNumber,
      state: "incoming_received",
      buildingId: data.buildingId,
      subcontractorId: data.subcontractorId,
      contractId: building.contractId,
      responsibleUserId: data.responsibleUserId,
    },
  });

  await prisma.incomingLetter.update({
    where: { id: data.incomingId },
    data: { linkedCaseId: created.id },
  });

  await prisma.caseEvent.create({
    data: {
      caseId: created.id,
      occurredAt: new Date(),
      kind: "incoming",
      title: `Получено письмо ${incoming.number}`,
      description: incoming.subject || undefined,
    },
  });

  return NextResponse.json({ id: created.id, caseNumber });
}

export async function GET() {
  const cases = await prisma.case.findMany({
    include: { building: true, subcontractor: true },
    orderBy: { caseNumber: "desc" },
  });
  return NextResponse.json(cases);
}
