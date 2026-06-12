import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { STAGE_LABELS, slotLabel } from "@/lib/labels";
import { saveResult, saveKickoff, recalcBracket, saveActualAwards, syncNow } from "@/app/actions/admin";
import { Flag } from "@/components/Flag";
import { PlayerSelect } from "@/components/PlayerSelect";
import { getAwardOptions } from "@/lib/players";

export const dynamic = "force-dynamic";

const STAGES = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"];

function toUtcInputValue(d: Date) {
  return d.toISOString().slice(0, 16);
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [matches, settings, options] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { id: "asc" },
    }),
    prisma.setting.findMany(),
    getAwardOptions(),
  ]);
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));

  return (
    <div className="rise">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-[var(--gold)]">ADMIN</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Los resultados se sincronizan solos desde ESPN; aquí puedes corregirlos
            (vacío = borrar). Al guardar se recalculan puntos y cruces. Horas en UTC.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={syncNow}>
            <button className="btn">Sincronizar resultados</button>
          </form>
          <form action={recalcBracket}>
            <button className="btn btn-ghost">Recalcular cruces</button>
          </form>
        </div>
      </div>

      <section className="card mb-8 p-5">
        <h2 className="font-display mb-3 text-xl">PREMIOS OFICIALES</h2>
        <form action={saveActualAwards} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs text-[var(--muted)]">Goleador oficial</label>
            <PlayerSelect
              name="topScorer"
              groups={options.scorers}
              defaultValue={settingMap.get("topScorer") ?? ""}
            />
          </div>
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs text-[var(--muted)]">Arquero oficial</label>
            <PlayerSelect
              name="bestKeeper"
              groups={options.keepers}
              defaultValue={settingMap.get("bestKeeper") ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              name="awardsLocked"
              defaultChecked={settingMap.get("awardsLocked") === "1"}
              className="size-4 accent-[var(--grass)]"
            />
            Cerrar apuestas de premios
          </label>
          <button className="btn">Guardar</button>
        </form>
      </section>

      {STAGES.map((stage) => {
        const stageMatches = matches.filter((m) => m.stage === stage);
        if (!stageMatches.length) return null;
        return (
          <section key={stage} className="mb-8">
            <h2 className="font-display mb-3 text-2xl text-[var(--gold)]">
              {STAGE_LABELS[stage].toUpperCase()}
            </h2>
            <div className="flex flex-col gap-2">
              {stageMatches.map((m) => {
                const isDraw =
                  m.homeScore != null &&
                  m.awayScore != null &&
                  m.homeScore === m.awayScore;
                const needsWinner = stage !== "GROUP" && isDraw;
                return (
                  <div key={m.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="w-10 text-xs text-[var(--muted)]">P{m.id}</span>
                    <span className="flex w-44 items-center gap-2">
                      <Flag code={m.homeTeam?.flagCode} name={m.homeTeam?.name} size={22} />
                      <span className={m.homeTeam ? "" : "italic text-[var(--muted)]"}>
                        {m.homeTeam?.name ?? slotLabel(m.homeSlot)}
                      </span>
                    </span>

                    <form action={saveResult} className="flex items-center gap-2">
                      <input type="hidden" name="matchId" value={m.id} />
                      <input
                        type="number"
                        name="homeScore"
                        min={0}
                        max={99}
                        defaultValue={m.homeScore ?? ""}
                        className="score-input !h-9 !w-11 !text-base"
                      />
                      <span className="text-[var(--muted)]">–</span>
                      <input
                        type="number"
                        name="awayScore"
                        min={0}
                        max={99}
                        defaultValue={m.awayScore ?? ""}
                        className="score-input !h-9 !w-11 !text-base"
                      />
                      {stage !== "GROUP" && m.homeTeam && m.awayTeam && (
                        <select
                          name="winnerId"
                          defaultValue={m.winnerId ?? ""}
                          className="input !w-auto !py-1.5 text-xs"
                          title="Ganador por penales (solo si hay empate)"
                        >
                          <option value="">Penales: –</option>
                          <option value={m.homeTeam.id}>{m.homeTeam.name}</option>
                          <option value={m.awayTeam.id}>{m.awayTeam.name}</option>
                        </select>
                      )}
                      <button className="btn !px-3 !py-1.5 !text-[11px]">OK</button>
                      {needsWinner && !m.winnerId && (
                        <span className="text-xs text-[var(--danger)]">falta penales</span>
                      )}
                    </form>

                    <span className="flex w-44 items-center justify-end gap-2 text-right">
                      <span className={m.awayTeam ? "" : "italic text-[var(--muted)]"}>
                        {m.awayTeam?.name ?? slotLabel(m.awaySlot)}
                      </span>
                      <Flag code={m.awayTeam?.flagCode} name={m.awayTeam?.name} size={22} />
                    </span>

                    <form action={saveKickoff} className="ml-auto flex items-center gap-2">
                      <input type="hidden" name="matchId" value={m.id} />
                      <input
                        type="datetime-local"
                        name="kickoff"
                        defaultValue={toUtcInputValue(m.kickoff)}
                        className="input !w-auto !py-1.5 text-xs"
                      />
                      <button className="btn btn-ghost !px-3 !py-1.5 !text-[11px]">Hora</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
