"use client";

import { useEffect, useState } from "react";

/** Muestra la fecha/hora del partido en la zona horaria del navegador. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const d = new Date(iso);
    setText(
      d.toLocaleString("es", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [iso]);

  return <span suppressHydrationWarning>{text}</span>;
}
