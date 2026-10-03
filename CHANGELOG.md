# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions numérotées en [SemVer](https://semver.org/lang/fr/) (0.x = version de test).

## [0.1.0] — 2026-10-03 · « La maison en commun »

Première version complète du jalon **M1 — l'argent fonctionne**, prête pour l'essai à quatre colocataires.

### Ajouté
- **Comptes** : inscription avec confirmation par email, connexion, mot de passe oublié, profil (prénom ou surnom).
- **Colocations** : création atomique, invitation par lien (7 jours, 10 utilisations, révocable), départ, retour, transfert du rôle de responsable, archivage.
- **Dépenses** : répartition égale ou montants exacts, modification, suppression, historique.
- **Soldes** : solde en une phrase, détail « Pourquoi ? », remboursements conseillés (au plus n−1 virements), enregistrement et annulation de remboursements, anciens colocataires avec solde non réglé.
- **Vie privée** : suppression de compte avec anonymisation (« Ancien colocataire N ») qui conserve l'exactitude des soldes ; page « Données et confidentialité ».
- **Identité visuelle** « La maison en commun » : logo, palette, mode sombre, cadre sur grand écran.
- **Accessibilité** : français, mobile d'abord, contrastes WCAG AA vérifiés automatiquement, installable (PWA de base).

### Sous le capot
- Montants en entiers (`bigint`) de bout en bout ; partage déterministe identique en TypeScript et en SQL.
- Sécurité au niveau des lignes (RLS) sur toutes les tables ; écritures par fonctions SQL transactionnelles.
- Près de 350 tests (unitaires et propriétés, pgTAP, intégration concurrente, E2E mobile + axe), intégration continue GitHub Actions.
- Déploiement Vercel (Paris) + Supabase (Paris) ; procédure dans `docs/deployment.md`.

### Limites connues
- Version de test : aucune conformité juridique n'est revendiquée.
- Expéditeur des emails technique (Brevo sans domaine propre).
- Pas encore de tâches, courses ni agenda (prévus après l'essai).

[0.1.0]: https://github.com/eulogep/Coloc4/releases/tag/v0.1.0
