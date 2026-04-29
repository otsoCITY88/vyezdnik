import { prisma } from "@/lib/prisma";
import { UsersScreen, UserView } from "@/components/UsersScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { cases: true } } },
    orderBy: { fullName: "asc" },
  });
  const view: UserView[] = users.map((u) => ({
    id: u.id, email: u.email, fullName: u.fullName,
    shortName: u.shortName, position: u.position,
    isHead: u.isHead, isAdmin: u.isAdmin, cases: u._count.cases,
  }));
  return <UsersScreen users={view} />;
}
