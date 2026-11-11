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

## Structure

```
src/
  data/site.ts          ← TOUT le contenu éditorial (textes, filiales, statuts, ANIMA, contact)
  styles/global.css     ← système de design : couleurs, typographie, boutons
  layouts/Layout.astro  ← <head>, SEO, Open Graph, en-tête, pied de page
  components/           ← Header, Footer, HeroEmblem (animation), EcosystemMap, AnimaCore, Doctrine…
  pages/
    index.astro               Accueil
    vision.astro              Notre vision
    ecosysteme/index.astro    Écosystème (carte interactive)
    ecosysteme/[slug].astro   Pages des filiales (générées depuis site.ts)
    anima.astro               ANIMA
    recherche.astro           Recherche & Innovation
    partenariats.astro        Partenariats
    contact.astro             Contact (formulaire)
    mentions-legales.astro, confidentialite.astro, 404.astro
public/images/          ← logo, emblème, logotype
```

## Modifier le contenu

Tout se passe dans `src/data/site.ts` :

- **Statut d'une filiale ou d'une capacité** : `live`, `dev`, `design`, `explore`, `target`.
  N'utiliser `live` (« Disponible ») qu'avec une preuve réelle.
- **Ajouter une filiale** : ajouter une entrée dans `entities` — sa page, sa place dans la carte
  et le pied de page sont générés automatiquement (prévoir sa position dans `EcosystemMap.astro`).
- **Formulaire de contact** : renseigner `site.contactEndpoint` (URL d'un service qui reçoit un POST,
  par ex. Formspree, une fonction serverless ou le futur backend). Tant qu'il est vide, le site
  indique honnêtement que le formulaire n'est pas encore raccordé.
- **E-mail et réseaux** : `site.contactEmail` et `site.socials` (n'ajouter que des comptes réels).
- **Mentions légales** : compléter `src/pages/mentions-legales.astro` et `confidentialite.astro`.

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
