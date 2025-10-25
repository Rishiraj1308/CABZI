import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.curocity.app',
  appName: 'Curocity',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
