"use client";

import { useActionState } from "react";
import Link from "next/link";

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string }>;

export function AuthForm({ mode, action }: { mode: "login" | "registro"; action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="rise mx-auto mt-10 max-w-sm">
      <div className="mb-8 text-center">
        <div className="font-display text-5xl leading-none">
          <span className="text-[var(--grass)]">LA POLLA</span>
          <br />
          <span className="text-[var(--cream)]">DEL MUNDIAL</span>{" "}
          <span className="text-[var(--gold)]">26</span>
        </div>
        <div className="font-display mt-3 text-sm tracking-[0.3em] text-[var(--gold)]">
          RAMIREZ · RUBIO · ESPINOSA
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {mode === "login"
            ? "Entra y deja tus pronósticos"
            : "Crea tu cuenta y juega con el grupo"}
        </p>
      </div>

      <form action={formAction} className="card flex flex-col gap-3 p-6">
        {mode === "registro" && (
          <input
            name="displayName"
            placeholder="Tu nombre (para el ranking)"
            className="input"
            required
            maxLength={30}
          />
        )}
        <input
          name="username"
          placeholder="Usuario"
          className="input"
          required
          autoCapitalize="none"
          autoCorrect="off"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          className="input"
          required
        />
        {state?.error && (
          <p className="text-sm text-[var(--danger)]">{state.error}</p>
        )}
        <button className="btn mt-1" disabled={pending}>
          {pending ? "Un momento…" : mode === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-[var(--grass)] hover:underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[var(--grass)] hover:underline">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
