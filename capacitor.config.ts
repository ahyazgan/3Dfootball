import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ornek.futbol3d',
  appName: 'Futbol 3D',
  webDir: 'dist',
  // Tarayıcı/WebView üzerinden kamera erişimi (getUserMedia) için
  // güvenli bağlam gerekir; Capacitor varsayılan olarak https şeması sunar.
  server: {
    androidScheme: 'https',
  },
};

export default config;
