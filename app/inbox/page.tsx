import { prisma } from "@/lib/prisma";
import { dateShort } from "@/lib/format";
import { InboxScreen } from "@/components/InboxScreen";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [all, fromOrgs, buildings, cases] = await Promise.all([
    prisma.incomingLetter.findMany({
      include: { fromOrganization: true, building: true, linkedCase: true },
      orderBy: { incomingDate: "desc" },
    }),
    prisma.organization.findMany({
      where: { kind: { in: ["customer", "subcontractor", "administration", "prosecutor", "fund"] } },
      orderBy: [{ kind: "asc" }, { shortName: "asc" }],
    }),
    prisma.building.findMany({ orderBy: [{ street: "asc" }, { house: "asc" }] }),
    prisma.case.findMany({
      include: { building: true, subcontractor: true },
      orderBy: { caseNumber: "desc" },
    }),
  ]);

  const view = all.map((i) => ({
    id: i.id,
    number: i.number,
    subject: i.subject,
    pageCount: i.pageCount,
    fromShort: i.fromOrganization.shortName,
    dateShort: dateShort(i.incomingDate),
    applicantName: i.applicantName,
    applicantOrigin: i.applicantOrigin,
    buildingFull: i.building?.fullAddress,
    linkedCaseId: i.linkedCaseId,
    linkedCaseNumber: i.linkedCase?.caseNumber,
  }));

  return (
    <InboxScreen
      unlinked={view.filter((i) => !i.linkedCaseId)}
      linked={view.filter((i) => i.linkedCaseId)}
      fromOrganizations={fromOrgs.map((o) => ({ id: o.id, label: `${o.shortName}` }))}
      buildings={buildings.map((b) => ({ id: b.id, label: b.fullAddress }))}
      cases={cases.map((c) => ({
        id: c.id, caseNumber: c.caseNumber,
        address: c.building.shortAddress, spo: c.subcontractor.shortName,
      }))}
    />
  );
}
