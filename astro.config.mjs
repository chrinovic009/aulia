import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Domaine officiel : sert aux URL canoniques, hreflang et images de partage.
  site: 'https://www.aulia-holding.com',
  // Rendu à la demande : le contenu vient de la base de données (versions validées).
  output: 'server',
  adapter: vercel({ maxDuration: 60 }),
  security: { checkOrigin: true },
  vite: {
    plugins: [tailwindcss()],
  },
});
