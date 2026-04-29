import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  shortName: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  isHead: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;
  try {
    const created = await prisma.user.create({
      data: {
        email: d.email, fullName: d.fullName,
        shortName: d.shortName || autoShort(d.fullName),
        position: d.position || null,
        isHead: d.isHead ?? false, isAdmin: d.isAdmin ?? false,
      },
    });
    return NextResponse.json({ id: created.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "email_taken" }, { status: 409 });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function GET() {
  const all = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json(all);
}

function autoShort(full: string): string {
  const parts = full.split(/\s+/);
  if (parts.length >= 3) return `${parts[1][0]}.${parts[2][0]}. ${parts[0]}`;
  if (parts.length === 2) return `${parts[1][0]}. ${parts[0]}`;
  return full;
}
