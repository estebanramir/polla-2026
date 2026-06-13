"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/app/actions/push";

type State =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "ios-install"
  | "off"
  | "on"
  | "denied";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationsToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey) {
        // las claves VAPID no están configuradas en el servidor
        setState("unconfigured");
        return;
      }
      if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
        const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as unknown as { standalone?: boolean }).standalone;
        setState(isIos && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch((e) => {
      console.error("push init:", e);
      setState("unsupported");
    });
  }, [publicKey]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await savePushSubscription(sub.toJSON() as never);
      if (res?.error) {
        setError(res.error);
        setState("off");
      } else {
        setState("on");
      }
    } catch (e) {
      console.error("push subscribe:", e);
      setError("No se pudo activar. Revisa que el navegador permita notificaciones.");
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      console.error("push unsubscribe:", e);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported" || state === "unconfigured") {
    return null;
  }

  if (state === "ios-install") {
    return (
      <p className="text-xs text-[var(--muted)]">
        🔔 Para recibir avisos en iPhone: <strong>Compartir → Agregar a inicio</strong> y
        abre la app desde ahí.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-[var(--muted)]">
        🔕 Notificaciones bloqueadas — actívalas en la configuración del navegador.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {state === "on" ? (
        <button
          onClick={disable}
          disabled={busy}
          className="chip chip-grass w-fit cursor-pointer hover:opacity-80"
          title="Desactivar avisos"
        >
          🔔 {busy ? "…" : "Avisos activados — toca para desactivar"}
        </button>
      ) : (
        <button onClick={enable} disabled={busy} className="btn w-fit !px-3 !py-1.5 !text-[11px]">
          🔔 {busy ? "Activando…" : "Avisarme si me faltan pronósticos"}
        </button>
      )}
      {error && <span className="text-[11px] text-[var(--danger)]">{error}</span>}
    </div>
  );
}
