import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexo.secure',
  appName: 'NEXO',
  webDir: 'client/dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    allowNavigation: []
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0B0F1A',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true
    }
  },
  android: {
    backgroundColor: '#0B0F1A',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    backgroundColor: '#0B0F1A',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;