import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Polla del Mundial Ramirez Rubio Espinosa",
    short_name: "Polla Mundial",
    description: "Predicciones del Mundial 2026",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1410",
    theme_color: "#0a1410",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
