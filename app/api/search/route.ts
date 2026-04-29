import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ cases: [], buildings: [], organizations: [], outgoing: [] });
  const like = `%${q}%`;

  const [cases, buildings, orgs, docs] = await Promise.all([
    prisma.case.findMany({
      where: {
        OR: [
          { caseNumber: { contains: q } },
          { building: { fullAddress: { contains: q } } },
          { incomingLetter: { number: { contains: q } } },
          { incomingLetter: { applicantName: { contains: q } } },
          { subcontractor: { shortName: { contains: q } } },
        ],
      },
      include: { building: true, subcontractor: true, incomingLetter: true },
      take: 8,
    }),
    prisma.building.findMany({
      where: { OR: [{ fullAddress: { contains: q } }, { street: { contains: q } }] },
      take: 6,
    }),
    prisma.organization.findMany({
      where: { OR: [{ shortName: { contains: q } }, { fullName: { contains: q } }, { inn: { contains: q } }] },
      take: 6,
    }),
    prisma.document.findMany({
      where: { OR: [{ outgoingNumber: { contains: q } }, { subject: { contains: q } }] },
      include: { case: true },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    cases: cases.map((c) => ({
      id: c.id, kind: "case",
      title: `${c.caseNumber} · ${c.building.shortAddress}`,
      subtitle: `${c.subcontractor.shortName}${c.incomingLetter ? ` · вх. ${c.incomingLetter.number}` : ""}`,
      href: `/cases/${c.id}`,
    })),
    buildings: buildings.map((b) => ({
      id: b.id, kind: "building",
      title: b.fullAddress,
      subtitle: "МКД",
      href: `/buildings`,
    })),
    organizations: orgs.map((o) => ({
      id: o.id, kind: "org",
      title: o.shortName,
      subtitle: o.fullName,
      href: `/organizations`,
    })),
    outgoing: docs.map((d) => ({
      id: d.id, kind: "doc",
      title: `${d.outgoingNumber} · ${d.subject || d.templateKind}`,
      subtitle: `Дело ${d.case.caseNumber}`,
      href: `/cases/${d.caseId}`,
    })),
  });
}
