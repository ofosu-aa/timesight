/* Capacitor configuration — ready for native iOS wrapping.
   The Capacitor packages are intentionally NOT installed in this build;
   follow docs/MOBILE_DEPLOYMENT.md to add them and generate the iOS project. */
const config = {
  appId: "com.timesight.app",
  appName: "TimeSight",
  webDir: "out",
  server: { androidScheme: "https" },
  ios: { contentInset: "always" },
};
export default config;
