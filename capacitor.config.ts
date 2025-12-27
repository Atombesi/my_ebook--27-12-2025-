import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myebook.app',
  appName: 'MY_Ebook',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;