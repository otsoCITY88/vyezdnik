// GET /api/files/revisions?ownerType=incoming&ownerId=<id>
// Возвращает список версий файла, отсортированных от новейшей к старой.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRevisions } from "@/lib/file-revisions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ownerType = searchParams.get("ownerType");
  const ownerId = searchParams.get("ownerId");
  if (!ownerType || !ownerId) {
    return NextResponse.json({ error: "ownerType_and_ownerId_required" }, { status: 400 });
  }

  const revs = await listRevisions(ownerType, ownerId);
  return NextResponse.json(revs);
}
