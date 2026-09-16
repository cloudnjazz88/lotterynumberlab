/**
 * Pure path helpers for Worker routing. Kept separate so Node tests can
 * cover the extensionless → .html rules without spinning up Cloudflare.
 */

/** Last path segment has no "." — e.g. /powerball, /guides/faq */
export function isExtensionlessPath(pathname) {
  if (!pathname || pathname === "/") return false;
  if (pathname.endsWith("/")) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return last.length > 0 && !last.includes(".");
}

/**
 * If this path is an extensionless page URL (or a trailing-slash alias),
 * return the candidate .html asset path. Caller must verify the asset exists.
 */
export function htmlAliasFor(pathname) {
  if (isExtensionlessPath(pathname)) return `${pathname}.html`;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const bare = pathname.replace(/\/+$/, "");
    if (isExtensionlessPath(bare)) return `${bare}.html`;
  }
  return null;
}
