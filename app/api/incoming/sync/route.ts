import { NextResponse } from "next/server";
import { syncImap } from "@/lib/imap-sync";

export async function POST() {
  const r = await syncImap();
  return NextResponse.json(r, { status: r.ok ? 200 : 200 });
}
