/**
 * Custom-domain requests for .xml/.svg were failing at the asset layer.
 * Serve those paths from plain-text copies with the correct Content-Type.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/sitemap.xml") {
      return serveAsset(env, request, "/sitemap.txt", "application/xml; charset=utf-8");
    }

    if (url.pathname === "/favicon.svg") {
      return serveAsset(env, request, "/favicon.svg.txt", "image/svg+xml; charset=utf-8");
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
