# AULIA — Portail et espace interne

Portail numérique du groupe AULIA (www.aulia-holding.com) et espace interne de gouvernance :
le fondateur crée les filiales et nomme les DG, chaque DG gère son équipe, et tout le contenu du
site public vit dans une base PostgreSQL. Rien n'est publié sur le site sans la validation du fondateur.

## Démarrer en local

**Avec Docker (le plus simple)** : le fichier `.env` local est déjà prêt.

```bash
npm install
npm run db:setup   # démarre PostgreSQL dans Docker (port 55432) et crée les tables
npm run dev        # puis http://localhost:4321/admin/rejoindre
```

**Sans Docker** :

```bash
npm install            # installe aussi Prisma et génère le client de base de données
cp .env.example .env   # puis compléter les valeurs (voir plus bas)
npm run db:migrate     # crée les tables, les verrous et les données de départ
npm run dev            # http://localhost:4321  —  espace interne : http://localhost:4321/admin
npm test               # tests automatiques (sécurité, droits, contenu)
```

Sans `DATABASE_URL`, le site public fonctionne quand même avec ses textes de départ ;
l'espace interne indique que la base n'est pas configurée.

## Mise en ligne (Vercel) — à faire une fois

1. **Base de données** : Vercel → projet → *Storage* → *Create Database* → **Neon (PostgreSQL)**, offre gratuite.
   Vercel ajoute automatiquement `DATABASE_URL` et `DATABASE_URL_UNPOOLED` au projet.
2. **Variables** (Vercel → *Settings* → *Environment Variables*) :
   - `APP_SECRET` : chaîne aléatoire de 32 caractères ou plus (ne jamais la partager ni la changer ensuite) ;
   - `FOUNDER_EMAIL` : `chrinovicnyembo009@gmail.com` — seule adresse autorisée à créer le premier compte ;
   - `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_INBOX` : envoi des e-mails (voir plus bas) ;
   - facultatif : `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `APP_TIMEZONE` (par défaut `Africa/Kinshasa`).
3. **Tables** : depuis votre ordinateur, avec les mêmes valeurs dans `.env` : `npm run db:migrate`.
4. **Déployer**, puis ouvrir `https://www.aulia-holding.com/admin/rejoindre`, saisir l'adresse du fondateur,
   recevoir le code à 6 chiffres, choisir nom et mot de passe, puis activer la double vérification.
   À cette première connexion, tout le contenu actuel du site est importé dans la base.

### E-mails (codes à 6 chiffres, invitations, alertes)

- Créer un compte sur resend.com, ajouter le domaine `aulia-holding.com` et copier les enregistrements DNS
  qu'il donne dans Vercel → *Domains* → `aulia-holding.com` → *DNS Records*.
- Les enregistrements de Resend se placent sur des sous-domaines (`send.…`, `resend._domainkey`) :
  ils ne touchent pas ceux de la boîte contact@ (Zoho). Ne jamais créer un second enregistrement SPF
  à la racine du domaine : s'il en faut deux, les réunir sur une seule ligne.
- `MAIL_FROM="AULIA <no-reply@aulia-holding.com>"`, `CONTACT_INBOX="contact@aulia-holding.com"`.
- En attendant la vérification du domaine, Resend peut envoyer depuis `onboarding@resend.dev`,
  uniquement vers l'adresse du compte Resend : suffisant pour créer le compte fondateur.
- En local, sans clé, les e-mails (et donc les codes) s'affichent dans le terminal de `npm run dev`.

### Connexion avec GitHub (facultatif)

github.com → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App* :
URL de rappel `https://www.aulia-holding.com/api/auth/github/callback`. Copier l'identifiant et le secret
dans `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. Chaque personne relie ensuite son compte GitHub depuis
« Sécurité du compte » ; GitHub ne crée jamais de compte et la double vérification reste demandée.

## Qui fait quoi

| Rôle | Peut | Voit |
|---|---|---|
| Fondateur | créer les filiales, nommer les DG, rattacher une personne à plusieurs organisations, **valider et publier** | tout |
| DG | inviter son équipe, attribuer les rôles du catalogue (sauf DG), préparer et soumettre le contenu de sa filiale, traiter les questions des internautes | sa filiale (équipe, visites, questions, journal) |
| Employés | selon leur rôle (catalogue : `/admin/roles`) | leur filiale uniquement |

**Verrous appliqués par la base elle-même** (même en cas d'erreur dans le code) : un seul fondateur ;
seul le fondateur nomme un DG ou un rôle du groupe ; une personne déjà dans une organisation ne peut être
ajoutée à une autre que par le fondateur ; personne ne modifie sa propre appartenance ; on n'attribue qu'un
rôle inférieur au sien ; seule une version validée par le fondateur peut être mise en ligne ; le journal est
inaltérable. Tests : `psql … -f prisma/tests/governance.sql` (23 contrôles).

## Comptes et sécurité

- Création d'accès **sur invitation uniquement** ; l'adresse est prouvée par un **code à 6 chiffres** (10 min, 5 essais).
- **Double vérification** (application d'authentification : Google Authenticator, Microsoft Authenticator, 1Password…)
  obligatoire pour le fondateur, les DG, les adjoints et les validateurs. 10 **codes de secours** imprimables.
- **Récupération** : code à 6 chiffres envoyé à l'adresse principale ou à l'**adresse de secours** vérifiée.
  La double vérification reste demandée après. Téléphone et codes perdus : le fondateur réinitialise
  la double vérification de la personne (page Équipe).
- Si le fondateur perd tout (téléphone, codes et e-mails) : dernier recours par la base de données
  (`npm run db:studio` → table `users` → vider `totp_secret` et `totp_enabled_at` de son compte).
- Mots de passe chiffrés (scrypt), secrets TOTP chiffrés (AES-256-GCM), sessions stockées en empreinte,
  limitation des essais, protection contre les requêtes d'autres sites.

## Temps réel

Chaque ajout, modification ou suppression dans la base déclenche un événement (déclencheurs PostgreSQL,
table `change_events`). Les écrans ouverts le reçoivent par `/api/live` et se mettent à jour **sans
rechargement** : l'espace interne (validations, équipes, messages, visites, journal) et le site public
(dès qu'un contenu est publié). Seules les zones modifiées changent ; une saisie en cours n'est jamais écrasée.

## Contenu du site

- Tout le contenu (anglais et français) est géré dans `/admin/contenu`. Les fichiers `src/data/en.ts`,
  `fr.ts`, `src/data/pages/*.ts` et le dictionnaire `ui` de `src/i18n.ts` sont la **version de départ** et le
  **repli** : si la base est indisponible, le site les affiche et ne tombe jamais.
- Circuit : brouillon → soumis → validé (publié) ou refusé avec commentaire. Historique et retour à une
  version précédente.
- Statuts de maturité : `live` (uniquement avec preuve), `dev`, `design`, `explore`, `target`.

## Visites et questions des internautes

- Mesure d'audience **sans cookie** : page, langue, pays approximatif, appareil, provenance, interactions
  (demandes de présentation, partenariats, liens sortants). Aucune adresse IP conservée (empreinte quotidienne
  anonyme). Chaque DG voit les pages de sa filiale ; le fondateur voit tout.
- Formulaire de contact : enregistré dans la base, transmis à la filiale concernée selon l'objet
  (ex. « AULIA Care » → DG de Care), copie à `CONTACT_INBOX`.

## Structure

```
prisma/schema.prisma            ← modèle de données (Prisma)
prisma/migrations/0001_init/    ← tables + verrous + temps réel + catalogue des rôles
src/middleware.ts               ← contenu en ligne, contrôle d'accès à /admin
src/lib/server/                 ← authentification, droits, contenu, personnes, e-mails, QR code
src/lib/client/                 ← temps réel (mise à jour sans rechargement), espace interne
src/pages/admin/                ← espace interne ; src/pages/api/ ← points d'accès
src/data/blocks.ts              ← catalogue des blocs de contenu du site
tests/                          ← tests automatiques
```

## Langues

Anglais par défaut à la racine, français sous `/fr`. Choix mémorisé dans le navigateur (`aulia-lang`),
balises `hreflang` et `sitemap.xml` (`public/`). L'espace interne est en français.

## Thèmes clair et sombre

- Par défaut, le site et l'espace interne suivent le **thème de l'appareil** (et ses changements en direct).
- Le visiteur peut choisir **clair** ou **sombre** avec le bouton de thème (en-tête du site, bas du menu de
  l'espace interne, coin des pages de connexion) : Appareil → Clair → Sombre. Le choix est mémorisé dans son navigateur.
- Mécanisme : `src/components/ThemeScript.astro` (dans le `<head>`, avant l'affichage) pose `data-theme` sur `<html>` ;
  les couleurs viennent de variables CSS (`src/styles/global.css`, `src/styles/admin.css`), redéfinies pour le clair.
- Logos : versions pour fond clair `public/images/*-light.png`, affichées automatiquement (`.theme-light-only`).

## Écran d'ouverture — « l'éveil de l'emblème »

- `src/components/Preloader.astro` : seul l'emblème AULIA est animé, dans l'esprit d'ANIMA. Un point de lumière naît
  au cœur du cercle, une comète d'or trace le cercle, une constellation dessine le A, le cœur s'élève et devient
  le point d'or, la vague se déploie, une onde royale part du point d'or ; l'emblème rejoint ensuite l'accueil.
- SVG (le logo) + canvas 2D (la lumière), sans bibliothèque ; environ 4 s, une fois par session.
- Bouton et touche Échap pour passer, « réduire les animations » respecté, jamais plus de 8 s.

## Principes (cahier de vision)

- Aucun client, partenaire, chiffre, certification ou capacité inventé ; toute capacité future est marquée comme telle.
- Le logo officiel en vecteur (SVG) reste à fournir pour remplacer la reconstruction de l'emblème animé.

## En cas de souci

- `prepared statement … already exists` avec Neon : ajouter `&pgbouncer=true` à `DATABASE_URL`.
- Moteur Prisma introuvable sur Vercel : vérifier `binaryTargets` dans `prisma/schema.prisma` et redéployer.

## ANIMA — agent Aulia (orbe du site)

L'orbe dorée en bas à droite est l'agent **Aulia** d'ANIMA. Son cerveau tourne dans le site :

- `src/lib/server/anima/` : catalogue réel des filiales (statuts), gouvernance (score des prospects,
  confidentialité), moteur de langage interchangeable, agent Aulia, orchestrateur, page personnalisée ;
- routes : `/api/anima/chat`, `/api/anima/health`, `/api/anima/page/<id>` ;
- Mémoire du Royaume : tables `anima_*` (migration `0002_anima`) ; les prospects prioritaires et les
  demandes de présentation arrivent aussi dans **Messages** de l'espace d'administration et par e-mail ;
- widget : `public/scripts/anima-widget.js` (copie de `Anima/web/anima-widget.js`).

Mise en service : `ANIMA_LLM_API_KEY` (clé Gemini gratuite : https://aistudio.google.com/apikey) dans
Vercel et dans `.env`, puis `npm run db:migrate`. Sans clé, l'orbe reste en **veille** : le visiteur
laisse un message, transmis comme un message du formulaire de contact.

Confidentialité : les e-mails et téléphones des visiteurs sont masqués avant tout envoi au moteur externe.
Pour changer de moteur (Groq, Mistral, modèle hébergé par AULIA…), modifier `ANIMA_LLM_BASE_URL` et `ANIMA_LLM_MODEL`.
