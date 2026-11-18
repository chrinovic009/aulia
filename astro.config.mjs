import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Domaine officiel : sert aux URL canoniques, hreflang et images de partage.
  site: 'https://www.aulia-holding.com',
  // Rendu à la demande : le contenu vient de la base de données (versions validées).
  output: 'server',
  // adresses que les visiteurs tapent souvent
  redirects: {
    '/a-propos': '/fr/a-propos',
    '/fr/about': '/fr/a-propos',
    '/about-us': '/about',
    '/team': '/about',
    '/fr/equipe': '/fr/a-propos',
  },
  adapter: vercel({ maxDuration: 60 }),
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
