// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://horce-racing-bet-count.vercel.app',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 1.0,
      lastmod: new Date(),
      i18n: {
        defaultLocale: 'ja',
        locales: {
          ja: 'ja-JP'
        }
      }
    })
  ],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});