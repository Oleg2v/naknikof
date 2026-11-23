import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kolbassnik.kikkey.com',
  trailingSlash: 'always',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
    assets: '_a',
  },
  vite: {
    build: { cssMinify: 'lightningcss', assetsInlineLimit: 2048 },
  },
});
