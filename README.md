# AULIA — Portail institutionnel

Portail numérique du groupe AULIA : présentation du groupe, de sa doctrine, de son écosystème
(AULIA Care, Vigil, Flow, VR) et d'ANIMA, la couche d'intelligence transversale.

Phase 1 du cahier de vision : **portail institutionnel**. Les phases suivantes (ANIMA Concierge,
ANIMA Experience, ANIMA Business, intégration à l'écosystème) s'appuieront sur cette base.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # génère le site statique dans dist/
```

## Langues

- **Anglais par défaut** à la racine (`/`, `/vision`, `/ecosystem`…), **français** sous `/fr` (`/fr/vision`, `/fr/ecosysteme`…).
- Le bouton EN/FR de l'en-tête mène à la page équivalente dans l'autre langue ; le choix est mémorisé
  dans le navigateur du visiteur (clé `aulia-lang`) et respecté lors des visites suivantes.
- Balises `hreflang` générées automatiquement pour le référencement.

## Structure

```
src/
  i18n.ts               ← langues, correspondance des URL EN/FR, textes d'interface communs
  data/
    en.ts / fr.ts       ← contenu institutionnel (filiales, statuts, ANIMA, doctrine…) — même structure
    config.ts           ← formulaire de contact, e-mail, réseaux (commun aux deux langues)
    types.ts, site.ts
  views/                ← une vue par page, avec ses textes EN et FR en tête de fichier
  pages/                ← routes anglaises ; pages/fr/ ← routes françaises (simples renvois vers views/)
  components/, layouts/, styles/global.css
```

## Modifier le contenu

- **Textes des filiales, d'ANIMA, de la doctrine** : `src/data/en.ts` et `src/data/fr.ts` (modifier les deux).
- **Textes propres à une page** : en tête du fichier correspondant dans `src/views/` (blocs `en` et `fr`).
- **Statut d'une filiale ou d'une capacité** : `live`, `dev`, `design`, `explore`, `target`.
  N'utiliser `live` qu'avec une preuve réelle.
- **Formulaire de contact** : renseigner `CONTACT_ENDPOINT` dans `src/data/config.ts`. Tant qu'il est vide,
  le site indique honnêtement que le formulaire n'est pas encore raccordé.
- **E-mail et réseaux** : `CONTACT_EMAIL` et `SOCIALS` dans `src/data/config.ts`.
- **Mentions légales** : `src/views/Legal.astro` et `src/views/Privacy.astro`.

## Principes (cahier de vision)

- Aucun client, partenaire, chiffre, certification ou capacité inventé.
- Toute capacité future est marquée comme telle (« Architecture cible », « En conception »…).
- Les démonstrations futures d'ANIMA utiliseront uniquement des données synthétiques identifiées.
- Animations sobres, désactivées si l'utilisateur préfère réduire les mouvements.

## Domaine et SEO

Lorsque le domaine définitif est connu, l'ajouter dans `astro.config.mjs` (`site: 'https://…'`) :
les URL canoniques, Open Graph et données structurées l'utiliseront automatiquement.

## À fournir

- Le logo officiel en **vecteur (SVG)** : l'emblème animé de l'accueil est une reconstruction
  vectorielle du logo PNG actuel et doit être remplacé par le tracé officiel.

## Introduction ANIMA (chargement)

- Moteur : `public/scripts/anima-intro.js` — WebGL procédural (shaders GLSL, particules calculées sur le GPU),
  sans dépendance, chargé uniquement quand l'introduction est jouée (une fois par session).
- Amorce, transition vers le site et cas d'échec : `src/components/Preloader.astro`.
- Réglages (durées des phases, densités desktop/mobile) : objet `CONFIG` en tête de `anima-intro.js`.
- Garanties : bouton et touche Échap pour passer, « réduire les animations » respecté, repli si WebGL
  est indisponible, qualité adaptée automatiquement aux appareils lents, site jamais bloqué (sécurité à 25 s).
- Pour revoir l'introduction : ouvrir un nouvel onglet (ou vider `sessionStorage` → clé `aulia-intro`).
