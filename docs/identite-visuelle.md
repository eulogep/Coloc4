# Coloc4 — Identité visuelle « La maison en commun »

## Idée
Une maison, une fenêtre à quatre carreaux de couleurs différentes : plusieurs personnes, un seul toit.
Le ton est chaleureux et domestique (crème, terre cuite), jamais bancaire ni technique.

## Logo
`src/components/ui/logo.tsx` — `LogoMark` (pictogramme) et `Logo` (pictogramme + « Coloc**4** », le 4 en brique).

## Couleurs (jetons dans `src/app/globals.css`)
| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| canvas | `#FBF6EE` crème | `#15191F` | fond des pages |
| ink | `#1E2430` | `#F3EEE6` | texte |
| muted | `#5C6370` | `#A7AEB9` | texte secondaire |
| brand (brique) | `#B8431F` | `#F08A5D` | actions principales, accents |
| positive | `#1F6B45` | `#7FD1A0` | « On te doit » |
| negative | `#9A3412` | `#F4A37F` | « Tu dois » |
| carreaux | brique `#D9572B`, moutarde `#E8A33D`, sauge `#6E9F7B`, ciel `#5B8DEF` | | logo, pastilles des colocataires |

Toutes les paires texte/fond respectent le niveau WCAG AA (≥ 4,5:1), les bordures de champs ≥ 3:1.
La couleur n'est jamais le seul signal : chaque solde est une phrase, accompagnée d'une icône.

## Typographie
Nunito (Google Fonts, auto-hébergée par `next/font`) : ronde, très lisible, accents complets. Montants en chiffres tabulaires (`.tabular`).

## Formes et composants (`src/components/ui/`)
- Cartes arrondies (`rounded-3xl`), boutons « pilule » de 48 px minimum (`button.ts`).
- `Avatar` : initiale sur l'un des quatre carreaux, couleur stable par personne (déduite de l'identifiant).
- `EmptyState`, `MessagePage`, `AuthShell`, `Page` / `PageTitle`.
- Icônes : `lucide-react` (licence ISC), toujours décoratives (`aria-hidden`) à côté d'un texte.

## Cadre
Plein écran sur téléphone. Sur grand écran, l'appli tient dans une colonne de la largeur d'un téléphone, posée sur un motif de petites maisons.
