import type { CapacitorConfig } from "@capacitor/cli";

// The native shell opens the production web application. Keep local development
// overrides opt-in; CI and production builds always use the committed entry point.
const developmentServerUrl =
  process.env.NODE_ENV !== "production" && process.env.CAPACITOR_SERVER_URL
    ? process.env.CAPACITOR_SERVER_URL
    : undefined;

const config: CapacitorConfig = {
  appId: "vn.id.omni.app",
  appName: "VibeNest",
  webDir: "public",
  bundledWebRuntime: false,
  ...(developmentServerUrl
    ? {
        server: {
          url: developmentServerUrl,
          cleartext: developmentServerUrl.startsWith("http://"),
          allowNavigation: ["omni.id.vn", "www.omni.id.vn"],
        },
      }
    : {
        server: {
          allowNavigation: ["omni.id.vn", "www.omni.id.vn"],
        },
      }),
  android: {
    allowMixedContent: false,
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
