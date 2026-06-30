"use client";

import { useEffect } from "react";

/**
 * Al entrar a la vista por fecha sin un ancla específica en la URL, enfoca
 * la sección de "Hoy". Si la URL ya trae un ancla (#dia-…, #hoy) la respeta.
 */
export function ScrollToToday() {
  useEffect(() => {
    if (window.location.hash) return;
    requestAnimationFrame(() => {
      document.getElementById("hoy")?.scrollIntoView({ block: "start" });
    });
  }, []);
  return null;
}
