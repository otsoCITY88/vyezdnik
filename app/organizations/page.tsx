import { prisma } from "@/lib/prisma";
import { safeJSON } from "@/lib/format";
import { OrganizationsScreen, OrgView } from "@/components/OrganizationsScreen";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  const orgs = await prisma.organization.findMany({
    include: { contacts: true, _count: { select: { contracts: true, casesAsSubco: true } } },
    orderBy: [{ kind: "asc" }, { shortName: "asc" }],
  });

  const view: OrgView[] = orgs.map((o) => ({
    id: o.id,
    kind: o.kind,
    shortName: o.shortName,
    fullName: o.fullName,
    inn: o.inn, kpp: o.kpp, ogrn: o.ogrn,
    legalAddress: o.legalAddress,
    defaultEmail: o.defaultEmail,
    extraEmails: safeJSON<string[]>(o.extraEmails, []),
    contacts: o.contacts.map((c) => ({
      id: c.id,
      lastName: c.lastName,
      firstName: c.firstName,
      middleName: c.middleName,
      position: c.position,
      dativePosition: c.dativePosition,
      dativeName: c.dativeName,
      vocativeName: c.vocativeName,
      shortName: c.shortName || `${c.lastName} ${c.firstName}`,
      email: c.email,
      isOurSignatory: c.isOurSignatory,
      isOurExecutor: c.isOurExecutor,
    })),
    cases: o._count.casesAsSubco,
  }));

  return <OrganizationsScreen orgs={view} />;
}
