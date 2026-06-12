import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { POINTS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function TablaPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const rows = await getLeaderboard();
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="rise">
      <h1 className="font-display mb-1 text-4xl text-[var(--gold)]">RANKING</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Exacto {POINTS.exact} pts · Ganador/empate {POINTS.outcome} pts · Goleador{" "}
        {POINTS.topScorer} pts · Arquero {POINTS.bestKeeper} pts
      </p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3 text-center">Exactos</th>
              <th className="px-4 py-3 text-center">Aciertos</th>
              <th className="px-4 py-3 text-center">Premios</th>
              <th className="px-4 py-3 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-[var(--line)] last:border-0 ${
                  r.id === current.id ? "bg-[rgba(47,224,124,0.07)]" : ""
                }`}
              >
                <td className="px-4 py-3 font-display text-lg">{medal[i] ?? i + 1}</td>
                <td className="px-4 py-3 font-semibold">
                  {r.name}
                  {r.id === current.id && (
                    <span className="ml-2 text-xs text-[var(--grass)]">(tú)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">{r.exacts}</td>
                <td className="px-4 py-3 text-center tabular-nums">{r.outcomes}</td>
                <td className="px-4 py-3 text-center tabular-nums">
                  {r.awardPts > 0 ? `+${r.awardPts}` : "–"}
                </td>
                <td className="px-4 py-3 text-right font-display text-xl text-[var(--gold)] tabular-nums">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
