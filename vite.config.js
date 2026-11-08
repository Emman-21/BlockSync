import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_TITLE, BRANDING } from './src/config/branding.js';
export default defineConfig({
  plugins: [react(), {
    name: 'blocksync-branding',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const title = APP_TITLE.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
        return html.replace('%APP_TITLE%', title);
      },
    },
  }, VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['favicon.ico', 'icons/*.png', 'network-fallback.svg'],
    manifest: {
      name: BRANDING.name, short_name: BRANDING.name,
      description: 'Block schedules, deadlines and announcements, with saved reading and local drafts.',
      start_url: '.', scope: '.', display: 'standalone', background_color: '#101322', theme_color: '#6366f1',
      icons: [
        { src: 'icons/drumpyy-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/drumpyy-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/drumpyy-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      globIgnores: ['**/NetworkScene-*.js'],
      runtimeCaching: [{
        urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/NetworkScene-[^/]+\.js$/.test(url.pathname),
        handler: 'CacheFirst',
        options: { cacheName: 'itnt3108-optional-scene', expiration: { maxEntries: 2, maxAgeSeconds: 604800 } },
      }],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/__/],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      // No runtime cache for Firebase/Auth/Worker/Cloudinary responses.
    },
  })],
  server: { port: 5174 }, preview: { port: 4174 },
  build: { outDir: 'dist', emptyOutDir: true },
});
