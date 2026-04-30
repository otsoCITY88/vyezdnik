import { prisma } from "@/lib/prisma";
import { BuildingsScreen, BuildingView } from "@/components/BuildingsScreen";
import { dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const [list, subcontractors, contracts] = await Promise.all([
    prisma.building.findMany({
      include: { subcontractor: true, contract: true, _count: { select: { cases: true } } },
      orderBy: [{ street: "asc" }, { house: "asc" }, { apartment: "asc" }],
    }),
    prisma.organization.findMany({ where: { kind: "subcontractor" } }),
    prisma.contract.findMany({ include: { subcontractor: true } }),
  ]);

  const view: BuildingView[] = list.map((b) => ({
    id: b.id,
    fullAddress: b.fullAddress,
    subcontractorShort: b.subcontractor?.shortName,
    contractNumber: b.contract?.number,
    cases: b._count.cases,
    city: b.city, street: b.street, house: b.house,
    apartment: b.apartment, porch: b.porch,
    subcontractorId: b.subcontractorId, contractId: b.contractId,
  }));

  const subOpts = subcontractors.map((s) => ({ id: s.id, label: s.shortName }));
  const contractOpts = contracts.map((c) => ({
    id: c.id,
    label: `${c.number} от ${dateShort(c.date)} · ${c.subcontractor.shortName}`,
    subcontractorId: c.subcontractorId,
  }));

  return <BuildingsScreen buildings={view} subcontractors={subOpts} contracts={contractOpts} />;
}
