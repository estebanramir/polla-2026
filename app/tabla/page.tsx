import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRankings } from "@/lib/leaderboard";
import { POINTS } from "@/lib/scoring";
import { RankingTabs } from "@/components/RankingTabs";

export const dynamic = "force-dynamic";

export default async function TablaPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const { groups, finals } = await getRankings();

  return (
    <div className="rise">
      <h1 className="font-display mb-1 text-4xl text-[var(--gold)]">RANKING</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Exacto {POINTS.exact} · Ganador/empate {POINTS.outcome} · Campeón{" "}
        {POINTS.champion} · Subcampeón {POINTS.runnerUp} · Goleador {POINTS.topScorer} ·
        Arquero {POINTS.bestKeeper} pts
      </p>

      <RankingTabs groups={groups} finals={finals} currentId={current.id} />
    </div>
  );
}
