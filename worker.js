/**
 * Custom-domain requests for .xml/.svg were failing at the asset layer.
 * Serve those paths from plain-text copies with the correct Content-Type.
 * www is a custom domain on this same zone — never onboard it as a new site.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.lotterynumberlab.com") {
      url.hostname = "lotterynumberlab.com";
      return Response.redirect(url.href, 301);
    }

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
