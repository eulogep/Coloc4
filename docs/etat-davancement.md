# Coloc4 — Où on en est (reprise de travail)

> Dernière mise à jour : **3 octobre 2026**.
> À relire en premier quand tu reviens. Aucun secret dans ce fichier : les clés et mots de passe ne doivent jamais y figurer.

## En une phrase

L'application est **terminée et en ligne** (jalon M1 : l'argent fonctionne). Il reste à la **valider en conditions réelles** (test de fumée, puis essai à 4 colocataires) et à **régler deux points de sécurité**.

## Liens utiles

| Quoi | Où |
|---|---|
| Appli en ligne | https://coloc4.vercel.app |
| Guide interactif | https://coloc4.vercel.app/guide |
| Dépôt GitHub | https://github.com/eulogep/Coloc4 |
| Release | https://github.com/eulogep/Coloc4/releases/tag/v0.1.0 |
| Projet Supabase (Paris) | https://supabase.com/dashboard/project/jmoyovqpufrykqldegan |
| Projet Vercel | https://vercel.com/euloges-projects-02a31b3b/coloc4 |
| Procédure de mise en production et protocole d'essai | [deployment.md](deployment.md) |
| Conception complète | [phase-0-design.md](phase-0-design.md) |
| Preuves de test | [m1-test-evidence.md](m1-test-evidence.md) |
| Identité visuelle | [identite-visuelle.md](identite-visuelle.md) |

## Ce qui est fait

- **18 tickets de code** (T-0001 à T-0018), tous fusionnés sur `main` : comptes, colocations, invitations, dépenses, soldes, remboursements, départ/retour, suppression de compte, emails (confirmation, mot de passe oublié), identité visuelle, guide interactif.
- **Mise en production** : base Supabase (Paris) avec les 7 migrations, vérification de santé réussie (7 contrôles sur 7), application Vercel (Paris), emails par Brevo, URL de redirection configurées.
- **Tests, tous au vert** : 116 unitaires, 195 base de données, 8 intégration, 34 bout en bout (accessibilité comprise). La CI GitHub est verte.
- **Vitrine GitHub** : README illustré, licence Apache 2.0 à ton nom, topics, description, tag et release v0.1.0.

## Ce qu'il reste à faire (par ordre de priorité)

### 1. Sécurité — à faire en premier
- [ ] **Régénérer la clé SMTP Brevo.** Elle a été écrite dans une conversation : à considérer comme compromise. Brevo → *SMTP & API* → onglet *SMTP* → supprimer l'ancienne clé, en créer une nouvelle, puis la coller dans Supabase → *Authentication → Emails → SMTP Settings → Password*.
- [ ] **Supprimer l'ancienne clé API Brevo** (celle qui commence par `xkeysib-`) : Brevo → *SMTP & API* → onglet *API Keys*.

### 2. Valider la production
- [ ] **Test de fumée sur ton téléphone**, avec une vraie adresse email : les 10 actions de l'étape 7 de [deployment.md](deployment.md). Si une étape échoue, note le numéro, l'heure et une capture d'écran, puis donne-les à Claude.
- [ ] **Tester une restauration de sauvegarde.** Une sauvegarde n'est valide qu'après avoir été restaurée une fois. Demander à Claude de préparer le test sur une base locale.

### 3. Essai réel (ticket T-0014)
- [ ] Inviter les 4 colocataires dans le groupe WhatsApp, avec une seule phrase, **sans démonstration**.
- [ ] Pendant 2 semaines : chronométrer une saisie par personne la 1ʳᵉ semaine, lancer les requêtes de suivi (dans [deployment.md](deployment.md)), noter les blocages.
- [ ] Faire passer le questionnaire de fin (5 questions, dans le même document).
- [ ] Décider : succès (les 4 utilisent l'appli sans aide et au moins 3 sur 4 expliquent leur solde) ou **changer le produit** avant d'ajouter des fonctions.

### 4. Questions ouvertes
- [ ] **Vérification juridique** de la conservation des montants anonymisés avant tout usage au-delà de l'essai entre amis. Aucune conformité RGPD n'est revendiquée.
- [ ] **Nom de domaine** (environ 10 €/an), facultatif : emails envoyés depuis une vraie adresse, URL plus propre.
- [ ] Marquer la release v0.1.0 comme « pre-release » si tu veux souligner que c'est une version de test (GitHub → Releases → Edit).

### 5. Après l'essai (version V1, seulement si l'essai est concluant)
Tâches ménagères avec rotation · liste de courses en temps réel · agenda partagé · tableau de bord · notifications dans l'appli.

## Reprendre le travail avec Claude

À dire en ouvrant la session : *« Lis docs/etat-davancement.md et continue. »*

**Remettre l'environnement local en route** (Docker doit tourner) :

```bash
cd "/Users/eulogemabiala/Desktop/Developer/projet logement "
npm run db:start        # base Supabase locale
npm run dev             # http://localhost:3000
```

**Tout vérifier d'un coup :**

```bash
npm run typecheck && npm run lint && npm test && npm run db:test && npm run test:integration && npm run test:e2e
```

## Bon à savoir

- **Déploiement automatique** : chaque envoi sur `main` redéploie la production sur Vercel (environ 1 minute). Claude te demande avant de pousser du code.
- **Outils déjà connectés sur ta machine** : Supabase CLI (projet lié), Vercel CLI, GitHub CLI `gh` (compte `eulogep`). Claude s'en sert directement, sans que tu lui donnes de clé. Pour retirer un accès : `gh auth logout`, `npx supabase logout`, `npx vercel logout`.
- **Ne jamais coller de clé ou de mot de passe dans une conversation.** Les coller directement dans les formulaires des tableaux de bord (Supabase, Brevo, Vercel).
- **Base locale sur le port 54422** (et non 54322) : un autre de tes projets, `maurritz-market`, occupe les ports par défaut. Ne pas l'arrêter.
- **Variables Vercel** : seulement `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `NEXT_PUBLIC_CONTACT_EMAIL`. Aucune clé secrète n'est utilisée par l'application.
- **Commandes Supabase en script** : toujours ajouter `</dev/null`, sinon elles peuvent rester bloquées en attente de saisie.
- **Emails Brevo** : l'adresse d'expéditeur affichée est technique (`…brevosend.com`) tant qu'aucun domaine n'est authentifié. C'est normal.
