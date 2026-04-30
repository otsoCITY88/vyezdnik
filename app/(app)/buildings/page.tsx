import { prisma } from "@/lib/prisma";
import { BuildingsScreen, BuildingView } from "@/components/BuildingsScreen";
import { dateShort, daysFromToday, safeJSON } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const [list, subcontractors, contracts] = await Promise.all([
    prisma.building.findMany({
      include: {
        subcontractor: true,
        contract: true,
        cases: { select: { state: true, deadlines: true } },
      },
      orderBy: [{ street: "asc" }, { house: "asc" }, { apartment: "asc" }],
    }),
    prisma.organization.findMany({ where: { kind: "subcontractor" } }),
    prisma.contract.findMany({ include: { subcontractor: true } }),
  ]);

  const view: BuildingView[] = list.map((b) => {
    const total = b.cases.length;
    const open = b.cases.filter((c) => c.state !== "closed").length;
    // Горящие: ближайший дедлайн ≤ 3 дня (в т.ч. просроченные).
    const burning = b.cases.filter((c) => {
      if (c.state === "closed") return false;
      const dl = safeJSON<Record<string, string>>(c.deadlines, {});
      const days = Object.values(dl)
        .filter(Boolean)
        .map((iso) => daysFromToday(iso))
        .filter((d): d is number => d !== null);
      return days.length > 0 && Math.min(...days) <= 3;
    }).length;

    return {
      id: b.id,
      fullAddress: b.fullAddress,
      subcontractorShort: b.subcontractor?.shortName,
      contractNumber: b.contract?.number,
      cases: total,
      casesOpen: open,
      casesBurning: burning,
      city: b.city, street: b.street, house: b.house,
      apartment: b.apartment, porch: b.porch,
      subcontractorId: b.subcontractorId, contractId: b.contractId,
    };
  });

  const subOpts = subcontractors.map((s) => ({ id: s.id, label: s.shortName }));
  const contractOpts = contracts.map((c) => ({
    id: c.id,
    label: `${c.number} от ${dateShort(c.date)} · ${c.subcontractor.shortName}`,
    subcontractorId: c.subcontractorId,
  }));

  return <BuildingsScreen buildings={view} subcontractors={subOpts} contracts={contractOpts} />;
}
