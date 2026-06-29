import { defineConfig } from 'vite';

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
});
