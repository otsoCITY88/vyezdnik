import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.renderedDocxPath) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const buf = readFileSync(doc.renderedDocxPath);
  const fn = basename(doc.renderedDocxPath);
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fn)}`,
    },
  });
}
