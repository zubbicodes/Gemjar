export function csrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const token = document.cookie.split("; ").find((entry) => entry.startsWith("gj_csrf="))?.split("=").slice(1).join("=");
  return token ? { "X-CSRF-Token": decodeURIComponent(token) } : {};
}
