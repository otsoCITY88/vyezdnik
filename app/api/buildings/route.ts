import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fullAddress, shortAddress } from "@/lib/format";

const Body = z.object({
  city: z.string().default("Мариуполь"),
  street: z.string().min(1),
  house: z.string().min(1),
  apartment: z.string().optional().or(z.literal("")),
  porch: z.string().optional().or(z.literal("")),
  subcontractorId: z.string().optional().or(z.literal("")),
  contractId: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;

  const created = await prisma.building.create({
    data: {
      city: d.city || "Мариуполь",
      street: d.street, house: d.house,
      apartment: d.apartment || null,
      porch: d.porch || null,
      shortAddress: shortAddress({ street: d.street, house: d.house, apartment: d.apartment || null }),
      fullAddress: fullAddress({
        city: d.city || "Мариуполь", street: d.street, house: d.house,
        apartment: d.apartment || null, porch: d.porch || null,
      }),
      subcontractorId: d.subcontractorId || null,
      contractId: d.contractId || null,
    },
  });
  return NextResponse.json({ id: created.id });
}
