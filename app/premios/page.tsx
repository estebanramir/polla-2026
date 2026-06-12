import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { POINTS } from "@/lib/scoring";
import { getAwardOptions } from "@/lib/players";
import { AwardsForm } from "@/components/AwardsForm";

export const dynamic = "force-dynamic";

export default async function PremiosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [prediction, settings, options] = await Promise.all([
    prisma.awardPrediction.findUnique({ where: { userId: user.id } }),
    prisma.setting.findMany(),
    getAwardOptions(),
  ]);
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));
  const locked = settingMap.get("awardsLocked") === "1";
  const actualScorer = settingMap.get("topScorer") ?? "";
  const actualKeeper = settingMap.get("bestKeeper") ?? "";

  return (
    <div className="rise mx-auto max-w-lg">
      <h1 className="font-display mb-1 text-4xl text-[var(--gold)]">PREMIOS</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Elige de la lista al goleador del torneo (+{POINTS.topScorer} pts) y al mejor
        arquero (+{POINTS.bestKeeper} pts). Puedes cambiarlos hasta que el admin cierre
        las apuestas.
      </p>

      <AwardsForm
        locked={locked}
        topScorer={prediction?.topScorer ?? ""}
        bestKeeper={prediction?.bestKeeper ?? ""}
        actualScorer={actualScorer}
        actualKeeper={actualKeeper}
        scorers={options.scorers}
        keepers={options.keepers}
      />
    </div>
  );
}
