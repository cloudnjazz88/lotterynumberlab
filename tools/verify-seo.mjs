/**
 * Crawlability and AdSense-asset checks against the built files, and optionally
 * against a live base URL (VERIFY_BASE=https://lotterynumberlab.com).
 */

import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ADS_LINE = "google.com, pub-9237217026636557, DIRECT, f08c47fec0942fa0";
const ADS_META = 'name="google-adsense-account" content="ca-pub-9237217026636557"';
const APEX = "https://lotterynumberlab.com";

let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const robots = await readFile(resolve(ROOT, "robots.txt"), "utf8");
check("robots.txt allows crawling", /^User-agent: \*\s*Allow: \//m.test(robots.replace(/\r\n/g, "\n")));
check("robots.txt sitemap is the HTTPS apex", robots.includes(`Sitemap: ${APEX}/sitemap.xml`));

const sitemap = await readFile(resolve(ROOT, "sitemap.xml"), "utf8");
check("sitemap.xml is a urlset", sitemap.includes("<urlset") && sitemap.includes("</urlset>"));
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check("sitemap has URLs", locs.length > 10);
check(
  "sitemap URLs are HTTPS apex only",
  locs.every((loc) => loc.startsWith(`${APEX}/`) || loc === `${APEX}/`),
);
check("sitemap has no http:// or www URLs", locs.every((loc) => !loc.includes("http://") && !loc.includes("://www.")));

for (const loc of locs) {
  const path = loc === `${APEX}/` ? "index.html" : loc.slice(`${APEX}/`.length).replace(/\/$/, "/index.html");
  try {
    await access(resolve(ROOT, path));
  } catch {
    check(`sitemap target exists: ${path}`, false);
  }
}

const ads = (await readFile(resolve(ROOT, "ads.txt"), "utf8")).trim();
check("ads.txt has the exact publisher line", ads === ADS_LINE);

const home = await readFile(resolve(ROOT, "index.html"), "utf8");
const metaHits = home.split(ADS_META).length - 1;
check("homepage has the AdSense account meta tag", metaHits === 1, `count=${metaHits}`);
check("homepage is index,follow", /name="robots" content="index, follow/.test(home));
check("homepage canonical is HTTPS apex", home.includes(`rel="canonical" href="${APEX}/"`));
check("homepage has no empty ad placeholder", !home.includes("Advertisement") && !home.includes('class="ad-slot"'));

const samplePages = [
  "mega-millions.html",
  "powerball.html",
  "guides/index.html",
  "results/index.html",
  "about.html",
];
for (const file of samplePages) {
  const html = await readFile(resolve(ROOT, file), "utf8");
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1] || "";
  check(`${file} canonical is HTTPS apex`, canonical.startsWith(`${APEX}/`));
  check(`${file} is not noindex`, !/content="noindex/.test(html));
  check(`${file} has one AdSense meta tag`, (html.split(ADS_META).length - 1) === 1);
  check(`${file} has no ad-slot placeholder`, !html.includes('class="ad-slot"'));
}

const base = process.env.VERIFY_BASE;
if (base) {
  const agents = ["Googlebot", "Mediapartners-Google", "Google-Display-Ads-Bot"];
  const paths = ["/", "/robots.txt", "/sitemap.xml", "/ads.txt", "/mega-millions.html", "/guides/", "/results/"];
  for (const path of paths) {
    for (const agent of path === "/" ? agents : [agents[0]]) {
      const res = await fetch(new URL(path, base), {
        headers: { "user-agent": agent },
        redirect: "manual",
      });
      const ok = res.status === 200 || (path.endsWith(".html") && res.status >= 300 && res.status < 400);
      check(`${res.status} ${path} as ${agent}`, res.status === 200 || ok, `status=${res.status}`);
    }
  }
  const adsLive = await fetch(new URL("/ads.txt", base));
  check("live ads.txt is text/plain", (adsLive.headers.get("content-type") || "").includes("text/plain"));
  check("live ads.txt body matches", (await adsLive.text()).trim() === ADS_LINE);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nSEO / AdSense asset checks passed");
