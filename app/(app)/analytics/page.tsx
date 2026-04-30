import { spoSla, casesByMonth, topBuildings, workloadByUser, templateUsage } from "@/lib/analytics";
import { AnalyticsScreen } from "@/components/AnalyticsScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [sla, byMonth, top, workload, templates] = await Promise.all([
    spoSla(), casesByMonth(), topBuildings(), workloadByUser(), templateUsage(),
  ]);
  return <AnalyticsScreen spoSla={sla} byMonth={byMonth} topBuildings={top} workload={workload} templates={templates} />;
}
