import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { matchPoints } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/labels";
import { Flag } from "@/components/Flag";
import { LocalTime } from "@/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const [player, leaderboard, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        awardPrediction: true,
        predictions: {
          include: { match: { include: { homeTeam: true, awayTeam: true } } },
        },
      },
    }),
    getLeaderboard(),
    prisma.setting.findMany(),
  ]);
  if (!player) notFound();

  const teamNames = new Map(
    (await prisma.team.findMany({ select: { id: true, name: true } })).map((t) => [
      t.id,
      t.name,
    ])
  );
  const teamName = (tid: string | null | undefined) =>
    tid ? (teamNames.get(tid) ?? tid) : "Sin elegir";

  const row = leaderboard.find((r) => r.id === player.id);
  const position = row?.position ?? 0;
  const awardsLocked =
    settings.find((s) => s.key === "awardsLocked")?.value === "1";
  const isSelf = viewer.id === player.id;

  const now = new Date();
  // solo pronósticos de partidos ya iniciados (los demás son secretos)
  const visible = player.predictions
    .filter((p) => p.match.kickoff <= now)
    .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime());
  const hiddenCount = player.predictions.length - visible.length;

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="rise">
      <Link href="/tabla" className="text-sm text-[var(--muted)] hover:text-[var(--cream)]">
        ← Ranking
      </Link>

      <div className="mt-3 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display flex flex-wrap items-center gap-3 text-4xl">
            <span>
              {medal[position - 1] ?? ""} {player.displayName.toUpperCase()}
            </span>
            {player.badge && (
              <span className="chip chip-gold font-body text-base">{player.badge}</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            @{player.username}
            {isSelf && " · (tú)"}
            {player.pointsAdjustment !== 0 &&
              ` · ajuste de ${player.pointsAdjustment > 0 ? "+" : ""}${player.pointsAdjustment} pts`}
          </p>
        </div>
        <div className="flex gap-3 text-center">
          {[
            [`${position}°`, "Puesto"],
            [row?.total ?? 0, "Puntos"],
            [row?.exacts ?? 0, "Exactos"],
            [row?.outcomes ?? 0, "Aciertos"],
          ].map(([value, label]) => (
            <div key={label} className="card px-4 py-2.5">
              <div className="font-display text-2xl text-[var(--gold)]">{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="card mb-8 p-5">
        <h2 className="font-display mb-2 text-xl">PREMIOS</h2>
        {awardsLocked || isSelf ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              🏆 Campeón: <strong>{teamName(player.awardPrediction?.champion)}</strong>
            </span>
            <span>
              🥈 Subcampeón: <strong>{teamName(player.awardPrediction?.runnerUp)}</strong>
            </span>
            <span>
              ⚽ Goleador:{" "}
              <strong>{player.awardPrediction?.topScorer || "Sin elegir"}</strong>
            </span>
            <span>
              🧤 Arquero:{" "}
              <strong>{player.awardPrediction?.bestKeeper || "Sin elegir"}</strong>
            </span>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            🔒 Ocultos hasta que se cierren las apuestas de premios.
          </p>
        )}
      </section>

      <h2 className="font-display mb-1 text-xl">PRONÓSTICOS</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Solo se muestran los de partidos ya iniciados
        {hiddenCount > 0 && ` (${hiddenCount} aún en secreto)`}.
      </p>

      {visible.length === 0 ? (
        <p className="card p-5 text-sm text-[var(--muted)]">
          Todavía no hay pronósticos visibles.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {visible.map((p) => {
            const m = p.match;
            const hasResult = m.homeScore != null && m.awayScore != null;
            const pts = hasResult
              ? matchPoints(p, { homeScore: m.homeScore!, awayScore: m.awayScore! })
              : null;
            return (
              <div key={p.id} className="card flex items-center gap-3 p-3 text-sm">
                <div className="flex-1">
                  <div className="mb-1 text-[11px] text-[var(--muted)]">
                    P{m.id} · {STAGE_LABELS[m.stage]}
                    {m.group ? ` · Grupo ${m.group}` : ""} · <LocalTime iso={m.kickoff.toISOString()} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag code={m.homeTeam?.flagCode} name={m.homeTeam?.name} size={22} />
                    <span className="font-semibold">
                      {m.homeTeam?.name} {p.homeScore}-{p.awayScore} {m.awayTeam?.name}
                    </span>
                    <Flag code={m.awayTeam?.flagCode} name={m.awayTeam?.name} size={22} />
                  </div>
                  {hasResult && (
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      Resultado real: {m.homeScore}-{m.awayScore}
                    </div>
                  )}
                </div>
                {pts != null && (
                  <span className={`chip ${pts > 0 ? "chip-gold" : ""}`}>
                    {pts > 0 ? `+${pts}` : "0"} pts
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
