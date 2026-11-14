/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** contenu en ligne (blocs validés), par clé puis par langue */
    live?: import('./data/site.ts').LiveContent;
    /** dernier événement public connu au moment du rendu */
    liveSince?: number;
    /** personne connectée à l'espace interne */
    user?: import('./lib/server/authz.ts').UserCtx | null;
    dbReady?: boolean;
  }
}
