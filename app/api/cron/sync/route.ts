import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Respaldo programado (Vercel Cron); el sync principal ocurre al cargar el home
export async function GET() {
  try {
    const result = await syncResults({ force: true });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
