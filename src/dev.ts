// Development-only checks. Bundles built with tvml-react/build define
// process.env.NODE_ENV; without it, warnings stay on.

export const isDev = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
})();

const warned = new Set<string>();

/** console.warn once per message, in development only. */
export function warnOnce(message: string): void {
  if (!isDev || warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}
