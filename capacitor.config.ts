import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spinerecovery.tracker',
  appName: 'Epic Builder',
  webDir: 'dist/spine-recovery-tracker/browser',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_round',
      iconColor: '#3b82f6',
      sound: '',
    },
  },
};

export default config;
