import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omniportal.app',
  appName: 'MPT OmniPortal',
  webDir: 'out',
  server: {
    // This allows the app to load your UI using http so it matches your backend
    androidScheme: 'http', 
    // This tells the app that the backend IP is a trusted destination
    allowNavigation: ['103.249.84.244'],
    cleartext: true
  }
};

export default config;