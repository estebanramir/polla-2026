import { NextResponse } from "next/server";
import { sendPredictionReminders } from "@/lib/push";

export const dynamic = "force-dynamic";

// Recordatorio diario (Vercel Cron): a quien le falten pronósticos de hoy
export async function GET() {
  try {
    const result = await sendPredictionReminders(24);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
