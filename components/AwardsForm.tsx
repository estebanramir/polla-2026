"use client";

import { useState, useTransition } from "react";
import { saveAwards } from "@/app/actions/predictions";

export function AwardsForm({
  locked,
  topScorer,
  bestKeeper,
  actualScorer,
  actualKeeper,
}: {
  locked: boolean;
  topScorer: string;
  bestKeeper: string;
  actualScorer: string;
  actualKeeper: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveAwards(formData);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <form action={submit} className="card flex flex-col gap-5 p-6">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          ⚽ Goleador del Mundial
        </label>
        <input
          name="topScorer"
          defaultValue={topScorer}
          placeholder="Ej: Kylian Mbappé"
          className="input"
          disabled={locked}
          maxLength={60}
        />
        {actualScorer && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Goleador oficial: {actualScorer}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          🧤 Mejor arquero
        </label>
        <input
          name="bestKeeper"
          defaultValue={bestKeeper}
          placeholder="Ej: Emiliano Martínez"
          className="input"
          disabled={locked}
          maxLength={60}
        />
        {actualKeeper && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Arquero oficial: {actualKeeper}
          </p>
        )}
      </div>

      {locked ? (
        <p className="text-sm text-[var(--danger)]">
          Las apuestas de premios están cerradas.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button className="btn" disabled={pending}>
            {pending ? "Guardando…" : "Guardar premios"}
          </button>
          {saved && <span className="text-sm text-[var(--grass)]">Guardado ✓</span>}
          {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
        </div>
      )}
    </form>
  );
}
