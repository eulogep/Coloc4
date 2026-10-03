# Coloc4 — Mise en production et essai à 4 (T-0014)

Procédure à suivre dans l’ordre. Compte environ 1 h 30 la première fois.
Les noms de menus des dashboards peuvent varier légèrement selon les versions. Les étapes marquées 🔐 manipulent un secret : ne le colle **jamais** dans le code, un ticket, un chat ou une capture d’écran.

| Choix | Valeur | Pourquoi |
|---|---|---|
| Base de données + Auth | Supabase, région **West EU (Paris) `eu-west-3`** | Données en UE, proche des utilisateurs |
| Application | Vercel, fonctions en **Paris `cdg1`** (déjà fixé dans `vercel.json`) | Même ville que la base : moins de latence |
| Emails de connexion | **Brevo** (SMTP), expéditeur `eulogepindustry@gmail.com` | Société française, offre gratuite 300 emails/jour, fonctionne **sans nom de domaine** |

> **À savoir sur Brevo sans domaine :** une adresse Gmail ne peut pas être authentifiée chez Brevo. Pour les emails transactionnels, Brevo remplace donc automatiquement l’expéditeur par une adresse technique du type `…@….t-sender-sib.com`. Les emails partent bien, mais l’adresse affichée est moins jolie et le risque de spam est un peu plus élevé. Pour l’essai à 4, c’est suffisant. Plus tard : acheter un domaine (ex. `coloc4.fr`, environ 10 €/an) et l’authentifier dans Brevo.
> Source : [Brevo — Authenticate your domain](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC), vérifié le 2026-10-03.

---

## Étape 0 — Comptes à créer

1. **Supabase** : <https://supabase.com> → *Sign up* (avec GitHub, c’est le plus simple).
2. **Vercel** : <https://vercel.com> → *Sign up* avec GitHub (offre *Hobby*, gratuite).
3. **Brevo** : <https://www.brevo.com> → compte gratuit avec `eulogepindustry@gmail.com`.

---

## Étape 1 — Créer le projet Supabase

1. *New project* → nom `coloc4`.
2. **Database password** 🔐 : clique *Generate*, puis range-le dans un gestionnaire de mots de passe.
3. **Region** : *West EU (Paris)*.
4. Attends que le projet soit prêt (quelques minutes).
5. Note la **Project ref**, c’est-à-dire les 20 lettres dans l’URL `https://supabase.com/dashboard/project/<ref>`.

## Étape 2 — Envoyer le schéma (migrations)

Dans le terminal, à la racine du projet :

```bash
npx supabase login                       # ouvre le navigateur
npx supabase link --project-ref <ref>    # demande le mot de passe de la base 🔐
npx supabase db push --dry-run           # liste les 7 migrations qui vont être appliquées
npx supabase db push                     # applique-les
```

Ensuite, dans le dashboard → **SQL Editor** :

1. Colle tout le contenu de [`supabase/checks/hosted-preflight.sql`](../supabase/checks/hosted-preflight.sql), puis clique *Run*.
2. **Résultat attendu : une seule ligne avec 7 colonnes à `true`.** Le script crée un compte jetable, une colocation et une dépense, supprime le compte, puis annule tout : rien n’est conservé.
3. Si une colonne est `false` ou si le script affiche une erreur : **stop**. Envoie-moi la sortie exacte. C’est le point 4 que tu as validé (la suppression d’un compte directement par la base sur le projet hébergé).

## Étape 3 — Configurer Brevo

1. Brevo → **Senders, domains & dedicated IPs** → *Senders* → *Add a sender* :
   - nom : `Coloc4` ;
   - email : `eulogepindustry@gmail.com` ;
   - valide le code reçu sur cette boîte.
2. Brevo → **SMTP & API** → onglet *SMTP* :
   - note le **Login SMTP** (souvent ton email de compte) ;
   - clique *Generate a new SMTP key* 🔐, nomme-la `supabase-coloc4` et copie-la tout de suite (elle n’est affichée qu’une fois).

## Étape 4 — Configurer l’authentification Supabase

Dashboard Supabase → **Authentication**.

**Sign In / Providers → Email**
- *Enable email provider* : activé.
- **Confirm email : activé** (c’était désactivé en local).
- *Minimum password length* : `8`.
- *Password requirements* : *Letters and digits*.

**Emails → SMTP Settings → Enable custom SMTP**

| Champ | Valeur |
|---|---|
| Sender email | `eulogepindustry@gmail.com` |
| Sender name | `Coloc4` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | le *Login SMTP* Brevo |
| Password 🔐 | la clé SMTP Brevo |

Ensuite *Rate limits* → *Rate limit for sending emails* : laisse la valeur par défaut. Elle est largement suffisante pour 4 personnes.

**Emails → Templates**
- *Confirm signup* :
  - sujet : `Confirme ton adresse email — Coloc4` ;
  - corps : colle le contenu de [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html).
- *Reset password* :
  - sujet : `Choisis un nouveau mot de passe — Coloc4` ;
  - corps : colle le contenu de [`supabase/templates/recovery.html`](../supabase/templates/recovery.html).

> Ne lance **pas** `supabase config push` : il enverrait aussi les réglages locaux (adresse `127.0.0.1`, confirmation désactivée). Ces réglages-là se font à la main, dans le dashboard.

**URL Configuration** : on la remplit à l’étape 6, une fois l’adresse Vercel connue.

## Étape 5 — Déployer sur Vercel

1. Vercel → *Add New… → Project* → importe le dépôt GitHub `eulogep/Coloc4`.
2. Framework : *Next.js* (détecté automatiquement). Ne change rien d’autre.
3. **Environment Variables** :

| Nom | Valeur | Où la trouver |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase → *Project Settings → Data API* |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Supabase → *Project Settings → API Keys* (clé **publishable** uniquement) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `eulogepindustry@gmail.com` | affiché sur la page « Données et confidentialité » |

> ⚠️ N’ajoute **jamais** la clé `sb_secret_…` ni l’ancienne `service_role`. L’application n’en a pas besoin.

4. *Deploy*. Note l’adresse obtenue, par exemple `https://coloc4-xxxx.vercel.app`.
5. Vercel → *Settings → Functions* : vérifie que la région affichée est **Paris (cdg1)**.

## Étape 6 — Relier Supabase à l’adresse Vercel

Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://coloc4-xxxx.vercel.app` ;
- **Redirect URLs** : ajoute `https://coloc4-xxxx.vercel.app/**`.

Sans ça, les liens des emails pointent vers `localhost` et ne fonctionnent pas.

## Étape 7 — Test de fumée (toi seul, 15 min)

Sur ton téléphone, avec une **vraie** adresse email :

| # | Action | Attendu |
|---|---|---|
| 1 | Créer un compte | Message « Ouvre l’email… » |
| 2 | Ouvrir l’email (regarder aussi les spams) | Email en français « Confirme ton adresse » |
| 3 | Cliquer le lien | Arrivée sur « Ton profil », choix du prénom |
| 4 | Créer une colocation, puis un lien d’invitation | Lien `…/rejoindre#…` |
| 5 | Ouvrir le lien dans un **autre navigateur**, créer un 2ᵉ compte (autre email) et confirmer | Retour sur « Rejoindre « … » ? », puis entrée dans la colocation |
| 6 | Ajouter « Test » de 10 € entre les deux | Soldes : « On te doit 5,00 € » / « Tu dois 5,00 € » |
| 7 | Enregistrer le remboursement conseillé | « Tout le monde est à jour » |
| 8 | Se déconnecter, puis « Mot de passe oublié ? » | Email reçu, nouveau mot de passe accepté |
| 9 | Supprimer le 2ᵉ compte (Mon compte) | Il apparaît comme « Ancien colocataire 1 » |
| 10 | Archiver la colocation de test | Elle disparaît |

Si une ligne échoue : note le numéro, l’heure et ce qui s’affiche, puis envoie-le-moi.

## Étape 8 — Sauvegarde pendant l’essai

Les sauvegardes automatiques et leur durée dépendent de l’offre Supabase (**non vérifié** pour l’offre gratuite actuelle). Pendant l’essai, fais une copie manuelle chaque dimanche :

```bash
npx supabase db dump --data-only -f backups/$(date +%F)-data.sql   # mot de passe base 🔐
```

- Le dossier `backups/` est ignoré par git (données personnelles) : ne l’envoie jamais sur GitHub.
- ⚠️ Une sauvegarde n’est considérée comme valide qu’après un test de restauration. Ce test n’a **pas encore été fait** : je peux le préparer sur une base locale.

---

## T-0014 — Essai réel à 4 colocataires (2 semaines)

**Objectif (§24.2 du prompt) :** 4 vrais colocataires utilisent Coloc4 pendant au moins 2 semaines, **sans ton aide**, pour le parcours M1 (dépenses, soldes, remboursements).

### Démarrage (jour 1)
1. Tu crées la colocation et envoies le lien d’invitation **dans le groupe WhatsApp**, avec une seule phrase : « On teste Coloc4 pour nos dépenses communes pendant 2 semaines. »
2. Ne fais pas de démonstration. Si quelqu’un bloque, note le blocage **avant** d’aider.

### Ce qu’on mesure (sans outil d’analyse ajouté)

| Mesure | Comment |
|---|---|
| Temps pour saisir une dépense | Chronomètre une saisie par personne pendant la 1ʳᵉ semaine (objectif < 30 s) |
| Taux de correction | SQL ci-dessous (modifications et suppressions / créations) |
| Activité par semaine | SQL ci-dessous |
| Invitation réussie | 4 membres actifs sans aide ? |
| Compréhension des soldes | Questionnaire de fin (Q1–Q2) |

Requêtes à lancer dans le SQL Editor (en lecture seule, sans noms ni textes) :

```sql
-- Activité par semaine
select date_trunc('week', created_at)::date as semaine, action, count(*)
from public.activity_logs group by 1, 2 order by 1, 2;

-- Taux de correction des dépenses
select round(100.0 * count(*) filter (where action in ('expense.updated', 'expense.deleted'))
             / nullif(count(*) filter (where action = 'expense.created'), 0), 1) as taux_correction_pct
from public.activity_logs;

-- Invariant critique : doit renvoyer 0 ligne
select h.id from public.households h
where (select sum(private.member_net(h.id, m.id)) from public.household_members m where m.household_id = h.id) <> 0;
```

### Questionnaire de fin (5 min, à l’oral ou par écrit)
1. Sans regarder l’appli : combien dois-tu (ou te doit-on), et à qui ?
2. Ouvre « Pourquoi ? » : est-ce que ça correspond à ce que tu pensais ?
3. As-tu fait confiance aux calculs ? Sinon, à quel moment as-tu douté ?
4. Qu’est-ce qui t’a fait revenir à WhatsApp plutôt qu’à Coloc4 ?
5. Continuerais-tu à l’utiliser ? Pourquoi ?

### Critères de décision (§24.3)
- **Succès produit** : les 4 utilisent le parcours M1 pendant 2 semaines sans aide, et au moins 3 sur 4 répondent correctement à Q1.
- **Changer le produit (pas ajouter des fonctionnalités)** si : la saisie dépasse régulièrement 30 s, les soldes ne sont pas compris, les calculs ne sont pas crus, ou la saisie s’arrête.
- Les résultats décident si on passe à V1 (tâches, courses, agenda).
