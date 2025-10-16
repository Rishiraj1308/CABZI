import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cabzi.app',
  appName: 'Cabzi',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
