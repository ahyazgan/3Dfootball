import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Mobil/yerel test için host açık. Kamera (getUserMedia) localhost'ta
// HTTP üzerinden çalışır; gerçek cihazda HTTPS ya da localhost gerekir.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  // Rapier-compat WASM'ı base64 gömülü geldiği için ekstra eklenti gerekmez.
  // MediaPipe WASM/model dosyaları çalışma anında CDN'den yüklenir.
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Futbol 3D — Hareketle Penaltı',
        short_name: 'Futbol 3D',
        description: 'Kamerayla vücut hareketini algılayan 3D penaltı oyunu.',
        lang: 'tr',
        theme_color: '#0a3d1f',
        background_color: '#061a0e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Uygulama kabuğunu çevrimdışı önbelleğe al (Rapier ~2.2MB dahil)
        globPatterns: ['**/*.{js,css,html,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
