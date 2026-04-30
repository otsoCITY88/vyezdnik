import { prisma } from "@/lib/prisma";
import { NewCaseWizard } from "@/components/NewCaseWizard";

export const dynamic = "force-dynamic";

export default async function NewCasePage(
  { searchParams }: { searchParams: Promise<{ incoming?: string }> },
) {
  const params = await searchParams;
  const [incomings, buildings, subcontractors, users, ppk] = await Promise.all([
    prisma.incomingLetter.findMany({
      where: { linkedCaseId: null },
      include: { fromOrganization: true, building: true },
      orderBy: { incomingDate: "desc" },
    }),
    prisma.building.findMany({ orderBy: [{ street: "asc" }, { house: "asc" }] }),
    prisma.organization.findMany({ where: { kind: "subcontractor" } }),
    prisma.user.findMany(),
    prisma.organization.findFirst({ where: { kind: "customer" } }),
  ]);

  const initialIncomingId = params?.incoming;
  return (
    <NewCaseWizard
      incomings={incomings.map((i) => ({
        id: i.id,
        number: i.number,
        date: i.incomingDate.toISOString().slice(0, 10),
        subject: i.subject || "",
        from: i.fromOrganization.shortName,
        applicantName: i.applicantName || "",
        buildingId: i.buildingId || undefined,
        // Срок устранения из самого письма — wizard подставит как дедлайн "remedy".
        requestedRemedyDate: i.requestedRemedyDate
          ? i.requestedRemedyDate.toISOString().slice(0, 10)
          : undefined,
      }))}
      buildings={buildings.map((b) => ({
        id: b.id,
        label: b.fullAddress,
        subcontractorId: b.subcontractorId || undefined,
      }))}
      subcontractors={subcontractors.map((s) => ({ id: s.id, label: s.shortName }))}
      users={users.map((u) => ({ id: u.id, label: u.shortName || u.fullName }))}
      ppkName={ppk?.shortName || "ППК «Единый Заказчик»"}
      initialIncomingId={initialIncomingId}
    />
  );
}
