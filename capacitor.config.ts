const productionOrigin = "https://vibenest-vinhluong071-code.vercel.app";

const config = {
  appId: "vn.vibenest.app",
  appName: "VibeNest",
  webDir: "capacitor-web",
  server: {
    // This hybrid shell loads the hosted Next.js app so API routes and Supabase
    // Auth remain server-backed. Override for a dedicated release domain.
    url: process.env.CAPACITOR_SERVER_URL || productionOrigin,
    cleartext: false,
    allowNavigation: ["vibenest-vinhluong071-code.vercel.app"],
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
