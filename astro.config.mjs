// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://awaisqazi.github.io',
  base: '/los-guapos-run-club',
  vite: {
    plugins: [tailwindcss()],
  },
});
