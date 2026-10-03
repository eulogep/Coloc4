import type { MetadataRoute } from "next";
import { fr } from "@/i18n/fr";

// Basic installability only (§13.10): no offline-first behaviour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: fr.appName,
    short_name: fr.appName,
    description: fr.tagline,
    lang: "fr-FR",
    start_url: "/accueil",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#fbf6ee",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
