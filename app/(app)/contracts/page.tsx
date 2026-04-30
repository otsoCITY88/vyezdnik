import { prisma } from "@/lib/prisma";
import { dateShort, safeJSON } from "@/lib/format";
import { ContractsScreen, ContractView } from "@/components/ContractsScreen";

export const dynamic = "force-dynamic";

interface Clauses {
  warranty?: string[]; remedy?: string[]; responsibility?: string[];
  info_request?: string[]; penalty?: string[];
}

export default async function Page() {
  const [contracts, subs] = await Promise.all([
    prisma.contract.findMany({
      include: { subcontractor: true, _count: { select: { buildings: true, cases: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.organization.findMany({ where: { kind: "subcontractor" } }),
  ]);

  const view: ContractView[] = contracts.map((c) => {
    const cl = safeJSON<Clauses>(c.clauses, {});
    return {
      id: c.id, number: c.number,
      dateISO: c.date.toISOString().slice(0, 10),
      dateShort: dateShort(c.date),
      subcontractorId: c.subcontractorId,
      subcontractorShort: c.subcontractor.shortName,
      clauses: {
        warranty: cl.warranty || [],
        remedy: cl.remedy || [],
        responsibility: cl.responsibility || [],
        info_request: cl.info_request || [],
        penalty: cl.penalty || [],
      },
      penaltyAmountRub: c.penaltyAmount ? c.penaltyAmount / 100 : null,
      buildings: c._count.buildings,
      cases: c._count.cases,
    };
  });

  return <ContractsScreen contracts={view} subcontractors={subs.map((s) => ({ id: s.id, label: s.shortName }))} />;
}
