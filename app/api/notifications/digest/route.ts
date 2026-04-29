import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/digest";

export async function POST() {
  const r = await runDailyDigest();
  return NextResponse.json(r);
}
