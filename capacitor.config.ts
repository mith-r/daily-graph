import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thedailygraphs.app',
  appName: 'Daily Graphs',
  // Required by Capacitor even in remote-URL mode; point it at an empty dir.
  webDir: 'public',
  server: {
    // Remote URL mode: the app's WebView loads your live deployment.
    url: 'https://thedailygraphs.com',
    // Keep cookies (your jose session cookie) working across app restarts.
    cleartext: false,
    // Only the app's own domain navigates inside the WebView; external links
    // open in the system browser instead of trapping users in the shell.
    allowNavigation: ["thedailygraphs.com", "*.thedailygraphs.com"],
  },
  ios: {
    contentInset: 'automatic',
    // Lets the WebView background match your navy theme while pages load.
    backgroundColor: '#0a192f', // adjust to your exact bg-navy hex
  },
};

export default config;
