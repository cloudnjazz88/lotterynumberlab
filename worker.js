/**
 * Host canonicalization, HTTPS, and a few asset types that the static layer
 * has served with the wrong Content-Type on the custom domain.
 * www is a hostname on this same zone — never onboard it as a new site.
 */
const APEX = "lotterynumberlab.com";

function canonicalLocation(request) {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = (forwarded || url.protocol.replace(":", "")).toLowerCase();
  const host = (url.hostname || "").toLowerCase();
  const needsHttps = proto === "http";
  const needsApex = host === `www.${APEX}` || host === `www.${APEX}.`;
  if (!needsHttps && !needsApex) return null;

  url.protocol = "https:";
  url.hostname = APEX;
  url.port = "";
  return url.href;
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
      return env.ASSETS.fetch(new Request(indexUrl, request));
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
