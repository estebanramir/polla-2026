"use client";

import { useState, useTransition } from "react";
import { adminSavePrediction } from "@/app/actions/admin";

export function AdminPredCell({
  userId,
  userName,
  matchId,
  matchLabel,
  initialHome,
  initialAway,
  colorClass,
}: {
  userId: string;
  userName: string;
  matchId: number;
  matchLabel: string;
  initialHome: number | null;
  initialAway: number | null;
  colorClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current =
    initialHome != null && initialAway != null ? `${initialHome}-${initialAway}` : "·";

  function openModal() {
    setHome(initialHome?.toString() ?? "");
    setAway(initialAway?.toString() ?? "");
    setStep("edit");
    setError(null);
    setOpen(true);
  }

  function save() {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("matchId", String(matchId));
    fd.set("homeScore", home);
    fd.set("awayScore", away);
    setError(null);
    startTransition(async () => {
      const res = await adminSavePrediction(fd);
      if (res?.error) {
        setError(res.error);
        setStep("edit");
      } else {
        setOpen(false);
      }
    });
  }

  const willDelete = home === "" && away === "";

  return (
    <>
      <button
        onClick={openModal}
        className={`w-full px-2 py-2 text-center tabular-nums hover:bg-[var(--bg-card-hover)] hover:ring-1 hover:ring-[var(--grass-dim)] ${colorClass}`}
        title={`Editar pronóstico de ${userName}`}
      >
        {current}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display mb-1 text-lg">{userName}</h3>
            <p className="mb-4 text-xs text-[var(--muted)]">
              P{matchId} · {matchLabel}
            </p>

            {step === "edit" ? (
              <>
                <div className="mb-4 flex items-center justify-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    inputMode="numeric"
                    className="score-input"
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                    aria-label="Goles local"
                    autoFocus
                  />
                  <span className="text-[var(--muted)]">–</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    inputMode="numeric"
                    className="score-input"
                    value={away}
                    onChange={(e) => setAway(e.target.value)}
                    aria-label="Goles visitante"
                  />
                </div>
                {error && (
                  <p className="mb-3 text-center text-xs text-[var(--danger)]">{error}</p>
                )}
                <p className="mb-3 text-center text-[11px] text-[var(--muted)]">
                  {willDelete
                    ? "Vacío = borrar el pronóstico"
                    : "Deja ambos vacíos para borrarlo"}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost flex-1 !py-2 !text-xs"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn flex-1 !py-2 !text-xs"
                    onClick={() => setStep("confirm")}
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-center text-sm">
                  {willDelete ? (
                    <>
                      ¿Borrar el pronóstico de{" "}
                      <strong>{userName}</strong> para este partido?
                    </>
                  ) : (
                    <>
                      ¿Guardar <strong className="text-[var(--grass)]">{home}-{away}</strong>{" "}
                      como pronóstico de <strong>{userName}</strong>?
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost flex-1 !py-2 !text-xs"
                    onClick={() => setStep("edit")}
                    disabled={pending}
                  >
                    Volver
                  </button>
                  <button
                    className={`btn flex-1 !py-2 !text-xs ${willDelete ? "!bg-[var(--danger)] !text-white" : ""}`}
                    onClick={save}
                    disabled={pending}
                  >
                    {pending ? "Guardando…" : willDelete ? "Sí, borrar" : "Sí, guardar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
