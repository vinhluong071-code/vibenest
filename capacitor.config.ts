const productionOrigin = "https://vibenest-vinhluong071-code.vercel.app";
const serverUrl = process.env.CAPACITOR_SERVER_URL || productionOrigin;
const serverHost = new URL(serverUrl).host;

const config = {
  appId: "vn.vibenest.app",
  appName: "VibeNest",
  webDir: "capacitor-web",
  server: {
    // This hybrid shell loads the hosted Next.js app so API routes and Supabase
    // Auth remain server-backed. Override for a dedicated release domain.
    url: serverUrl,
    cleartext: false,
    allowNavigation: [serverHost],
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
