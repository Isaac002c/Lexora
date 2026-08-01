import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lexora — Gestão Jurídica",
    short_name: "Lexora",
    description: "Lexora, um produto Telun. Gestão jurídica segura e multi-tenant.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B0B12",
    theme_color: "#0B0B12",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
