/* Platform detection for web / PWA / iOS / future Capacitor native. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true;
}
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
export function isNative(): boolean {
  // Populated by Capacitor when wrapped natively.
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}
