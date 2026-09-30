/**
 * Verification for the "buying more tickets" guide: math helper, rendered HTML,
 * canonical/sitemap, structured data, internal links, and duplicate vs distinct wording.
 */
import { readFileSync, accessSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContext } from "./compute-context.mjs";
import {
  sameDrawJackpotProbability,
  multiDrawAtLeastOne,
  comparisonRows,
  GUIDE_TICKET_COUNTS,
} from "./more-tickets-math.mjs";
import { GUIDES } from "../content/guides.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const ctx = buildContext();
const mmN = ctx.mm.config.jackpotOdds;
const pbN = ctx.pb.config.jackpotOdds;
check("MM jackpot odds match official 290,472,336", mmN === 290472336, `got=${mmN}`);
check("PB jackpot odds match official 292,201,338", pbN === 292201338, `got=${pbN}`);
check("MM ticket price $5", /\$5/.test(ctx.mm.config.ticketPrice));
check("PB ticket price $2", /\$2/.test(ctx.pb.config.ticketPrice));

for (const n of GUIDE_TICKET_COUNTS) {
  const pMm = sameDrawJackpotProbability(n, mmN);
  const pPb = sameDrawJackpotProbability(n, pbN);
  check(`MM same-draw n=${n} is n/N`, Math.abs(pMm - n / mmN) < 1e-18);
  check(`PB same-draw n=${n} is n/N`, Math.abs(pPb - n / pbN) < 1e-18);
}
check("MM n=1 matches official 1/N", sameDrawJackpotProbability(1, mmN) === 1 / mmN);
check("PB n=1 matches official 1/N", sameDrawJackpotProbability(1, pbN) === 1 / pbN);

const mmRows = comparisonRows(mmN, 5);
const pbRows = comparisonRows(pbN, 2);
check("MM costs 5/25/50/500", mmRows.map((r) => r.cost).join(",") === "5,25,50,500");
check("PB costs 2/10/20/200", pbRows.map((r) => r.cost).join(",") === "2,10,20,200");
check("MM 100× one-ticket chance", Math.abs(mmRows[3].probability / mmRows[0].probability - 100) < 1e-12);
check("PB 100× one-ticket chance", Math.abs(pbRows[3].probability / pbRows[0].probability - 100) < 1e-12);
check("MM 100 ≈ 1 in 2.9e6", Math.round(1 / mmRows[3].probability) === 2904723);
check("PB 100 ≈ 1 in 2.9e6", Math.round(1 / pbRows[3].probability) === 2922013);

for (const n of GUIDE_TICKET_COUNTS) {
  const multi = multiDrawAtLeastOne(n, mmN);
  const expected = 1 - Math.pow(1 - 1 / mmN, n);
  check(`MM multi-draw complement n=${n}`, Math.abs(multi - expected) < 1e-15 || Math.abs(multi - expected) / expected < 1e-7);
}

const guide = GUIDES.find((g) => g.slug === "does-buying-more-lottery-tickets-improve-your-odds");
check("guide registered in GUIDES", !!guide);
check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);

const htmlPath = resolve(ROOT, "guides/does-buying-more-lottery-tickets-improve-your-odds.html");
let html = "";
try {
  accessSync(htmlPath);
  html = readFileSync(htmlPath, "utf8");
  check("built guide HTML exists", true);
} catch {
  check("built guide HTML exists", false);
}

if (html) {
  check("H1 matches short title", html.includes("<h1>Does Buying More Lottery Tickets Improve Your Odds?</h1>"));
  check(
    "document title uses SEO candidate",
    html.includes(
      "<title>Does Buying More Lottery Tickets Improve Your Odds? The Math for 1, 5, 10 and 100 Tickets | Lottery Number Lab</title>",
    ),
  );
  check(
    "canonical URL",
    html.includes(
      'rel="canonical" href="https://lotterynumberlab.com/guides/does-buying-more-lottery-tickets-improve-your-odds.html"',
    ),
  );
  check("Article JSON-LD present", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD present", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD present", html.includes('"@type":"BreadcrumbList"'));
  check("required takeaway sentence present", html.includes("Buying more tickets increases the chance of winning, but it does not make any individual number combination more likely to be drawn."));
  check("duplicate callout present", html.includes("Different combinations vs duplicate tickets"));
  check("duplicate wording rejects hit-probability boost", /duplicate tickets[\s\S]{0,400}do <em>not<\/em> increase the chance/i.test(html));
  check("distinct formula shown", html.includes("P(jackpot) = n / N"));
  check("multi-draw formula shown", html.includes("1 − (1 − 1/N)") || html.includes("1 - (1 - 1/N)"));

  // Table values match helper labels
  for (const row of [...mmRows, ...pbRows]) {
    check(`table has ${row.approxOneInLabel}`, html.includes(row.approxOneInLabel));
    check(`table has cost ${row.costLabel}`, html.includes(row.costLabel));
    check(`table has ${row.probabilityLabel}`, html.includes(row.probabilityLabel));
  }

  const mustLinks = [
    "../tools/odds-explorer.html",
    "../tools/lottery-spending-calculator.html",
    "independent-trials.html",
    "how-lottery-odds-are-calculated.html",
    "expected-value-of-a-lottery-ticket.html",
    "../responsible-play.html",
  ];
  for (const href of mustLinks) {
    check(`internal link ${href}`, html.includes(`href="${href}"`));
  }

  check("no ad-slot placeholder", !html.includes('class="ad-slot"'));
  check("adsense meta present", html.includes('name="google-adsense-account" content="ca-pub-9237217026636557"'));
  check("visible FAQ matches schema topics", html.includes('id="faq"') && html.includes("Do duplicate tickets"));
}

const sitemap = readFileSync(resolve(ROOT, "sitemap.xml"), "utf8");
check(
  "sitemap includes new guide",
  sitemap.includes("https://lotterynumberlab.com/guides/does-buying-more-lottery-tickets-improve-your-odds.html"),
);

const hub = readFileSync(resolve(ROOT, "guides/index.html"), "utf8");
check("guides hub says Sixteen guides", hub.includes("Sixteen guides covering"));
check("guides hub lists new guide card", hub.includes("does-buying-more-lottery-tickets-improve-your-odds.html"));

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nmore-tickets guide checks passed");
