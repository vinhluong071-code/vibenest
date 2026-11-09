import type { CapacitorConfig } from "@capacitor/cli";

// Native production builds load the bundled local Capacitor entry point.
// A remote URL is permitted only for an explicitly opted-in local development
// session; CI/release builds never inherit a hosted production URL.
const developmentServerUrl =
  process.env.NODE_ENV !== "production" && process.env.CAPACITOR_SERVER_URL
    ? process.env.CAPACITOR_SERVER_URL
    : undefined;

const config: CapacitorConfig = {
  appId: "vn.id.omni.app",
  appName: "VibeNest",
  webDir: "capacitor-web",
  ...(developmentServerUrl
    ? {
        server: {
          url: developmentServerUrl,
          cleartext: developmentServerUrl.startsWith("http://"),
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#07080d",
    },
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
