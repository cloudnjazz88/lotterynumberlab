/**
 * Host canonicalization, HTTPS, directory indexes, and extensionless → .html
 * aliases for pages that still exist as *.html assets.
 * www is a hostname on this same zone — never onboard it as a new site.
 *
 * Canonical public URLs remain *.html (sitemap + rel=canonical). Extensionless
 * paths that Google or old Cloudflare html_handling advertised must 301 to
 * those files — not 404 and not soft-redirect to the homepage.
 */
import { htmlAliasFor } from "./tools/worker-routes.mjs";

const APEX = "lotterynumberlab.com";

function canonicalLocation(request) {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = (forwarded || url.protocol.replace(":", "")).toLowerCase();
  const host = (url.hostname || "").toLowerCase();
  const needsHttps = proto === "http";
  const needsApex = host === `www.${APEX}` || host === `www.${APEX}.`;
  const needsHome = url.pathname === "/index.html";
  if (!needsHttps && !needsApex && !needsHome) return null;

  url.protocol = "https:";
  url.hostname = APEX;
  url.port = "";
  if (needsHome) url.pathname = "/";
  return url.href;
}

async function assetOk(env, request, pathname) {
  const probe = new URL(request.url);
  probe.pathname = pathname;
  const res = await env.ASSETS.fetch(new Request(probe.toString(), { method: "GET" }));
  return res.ok;
}

function redirectToPath(request, pathname) {
  const url = new URL(request.url);
  url.protocol = "https:";
  url.hostname = APEX;
  url.port = "";
  url.pathname = pathname;
  return Response.redirect(url.href, 301);
}

export default {
  async fetch(request, env) {
    const canonical = canonicalLocation(request);
    if (canonical && canonical !== request.url) {
      return Response.redirect(canonical, 301);
    }

    const url = new URL(request.url);

    if (url.pathname === "/sitemap.xml") {
      return serveAsset(env, request, "/sitemap.txt", "application/xml; charset=utf-8");
    }

    if (url.pathname === "/favicon.svg") {
      return serveAsset(env, request, "/favicon.svg.txt", "image/svg+xml; charset=utf-8");
    }

    if (url.pathname === "/ads.txt") {
      return serveAsset(env, request, "/ads.txt.txt", "text/plain; charset=utf-8");
    }

    if (url.pathname === "/.well-known/security.txt") {
      return serveAsset(env, request, "/security.txt.txt", "text/plain; charset=utf-8");
    }

    if (url.pathname === "/" || url.pathname.endsWith("/")) {
      const indexUrl = new URL(url.href);
      indexUrl.pathname = url.pathname === "/" ? "/index.html" : `${url.pathname}index.html`;
      const indexRes = await env.ASSETS.fetch(new Request(indexUrl, request));
      if (indexRes.ok || url.pathname === "/") return indexRes;

      const alias = htmlAliasFor(url.pathname);
      if (alias && (await assetOk(env, request, alias))) {
        return redirectToPath(request, alias);
      }
      return indexRes;
    }

    const alias = htmlAliasFor(url.pathname);
    if (alias && (await assetOk(env, request, alias))) {
      return redirectToPath(request, alias);
    }

    return env.ASSETS.fetch(request);
  },
};

async function serveAsset(env, request, assetPath, contentType) {
  const res = await env.ASSETS.fetch(new URL(assetPath, request.url));
  if (!res.ok) return res;
  return new Response(await res.text(), {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  });
}
