const productionOrigin = "https://omni.id.vn";
const serverUrl = process.env.CAPACITOR_SERVER_URL || productionOrigin;
const serverHost = new URL(serverUrl).host;
const config = {
  appId: "vn.id.omni.app",
  appName: "VibeNest",
  webDir: "capacitor-web",
  server: { url: serverUrl, cleartext: false, allowNavigation: [serverHost] },
  ios: { contentInset: "automatic", scrollEnabled: true },
};
export default config;
