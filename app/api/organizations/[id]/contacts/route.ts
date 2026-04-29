import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  dativePosition: z.string().optional().or(z.literal("")),
  dativeName: z.string().optional().or(z.literal("")),
  vocativeName: z.string().optional().or(z.literal("")),
  shortName: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  isOurSignatory: z.boolean().optional(),
  isOurExecutor: z.boolean().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;

  const shortName = d.shortName || `${d.firstName[0]}.${d.middleName?.[0] ? d.middleName[0] + "." : ""} ${d.lastName}`;

  const created = await prisma.contact.create({
    data: {
      organizationId: id,
      lastName: d.lastName, firstName: d.firstName, middleName: d.middleName || null,
      position: d.position || null,
      dativePosition: d.dativePosition || null,
      dativeName: d.dativeName || null,
      vocativeName: d.vocativeName || null,
      shortName,
      email: d.email || null,
      isOurSignatory: d.isOurSignatory ?? false,
      isOurExecutor: d.isOurExecutor ?? false,
    },
  });
  return NextResponse.json({ id: created.id });
}
