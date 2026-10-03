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
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
