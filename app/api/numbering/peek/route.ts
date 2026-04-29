import { NextResponse } from "next/server";
import { peekOutgoingNumber } from "@/lib/numbering";

export async function GET() {
  const next = await peekOutgoingNumber();
  return NextResponse.json({ next });
}
