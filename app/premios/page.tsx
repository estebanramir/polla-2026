import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { POINTS } from "@/lib/scoring";
import { getAwardOptions } from "@/lib/players";
import { getTeamOptions } from "@/lib/teams";
import { getAwardsState } from "@/lib/awards";
import { AwardsForm } from "@/components/AwardsForm";

export const dynamic = "force-dynamic";

export default async function PremiosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [prediction, settings, options, teams, awardsState] = await Promise.all([
    prisma.awardPrediction.findUnique({ where: { userId: user.id } }),
    prisma.setting.findMany(),
    getAwardOptions(),
    getTeamOptions(),
    getAwardsState(),
  ]);
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));
  const locked = awardsState.locked;

  return (
    <div className="rise mx-auto max-w-lg">
      <h1 className="font-display mb-1 text-4xl text-[var(--gold)]">PREMIOS</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Elige al campeón (+{POINTS.champion}), subcampeón (+{POINTS.runnerUp}), goleador
        (+{POINTS.topScorer}) y mejor arquero (+{POINTS.bestKeeper}). Solo se pueden
        elegir <strong>durante la fase de grupos</strong>; al empezar las eliminatorias
        se cierran. El goleador y el arquero se cuentan al terminar el torneo.
        {awardsState.groupStageOver && (
          <span className="mt-2 block text-[var(--danger)]">
            🔒 La fase de grupos terminó: los premios ya están cerrados.
          </span>
        )}
      </p>

      <AwardsForm
        locked={locked}
        topScorer={prediction?.topScorer ?? ""}
        bestKeeper={prediction?.bestKeeper ?? ""}
        champion={prediction?.champion ?? ""}
        runnerUp={prediction?.runnerUp ?? ""}
        actualScorer={settingMap.get("topScorer") ?? ""}
        actualKeeper={settingMap.get("bestKeeper") ?? ""}
        actualChampion={settingMap.get("champion") ?? ""}
        actualRunnerUp={settingMap.get("runnerUp") ?? ""}
        scorers={options.scorers}
        keepers={options.keepers}
        teams={teams}
      />
    </div>
  );
}
