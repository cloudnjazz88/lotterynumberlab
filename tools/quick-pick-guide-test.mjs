/**
 * Verification for the Quick Pick vs choosing-your-own guide: odds parity,
 * rendered HTML, canonical/sitemap, schema, wording guards, hub count.
 */
import { readFileSync, accessSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContext } from "./compute-context.mjs";
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
check("MM matrix 5/70+1/24-ish", /70/.test(ctx.mm.config.matrixLabel) && /24/.test(ctx.mm.config.matrixLabel));
check("PB matrix 5/69+1/26-ish", /69/.test(ctx.pb.config.matrixLabel) && /26/.test(ctx.pb.config.matrixLabel));

const guide = GUIDES.find((g) => g.slug === "quick-pick-vs-choosing-your-own-lottery-numbers");
check("guide registered in GUIDES", !!guide);
check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);
check("H1 / title field", guide?.title === "Quick Pick vs. Choosing Your Own Lottery Numbers: Does Either Have Better Odds?");
check(
  "SEO title field",
  guide?.seoTitle === "Quick Pick vs. Your Own Lottery Numbers: Does Either Have Better Odds?",
);
check(
  "meta description field",
  guide?.description ===
    "Quick Pick and self-chosen lottery numbers have the same odds. Learn what random selection changes, what it does not, and how popular picks may affect prize sharing.",
);

const htmlPath = resolve(ROOT, "guides/quick-pick-vs-choosing-your-own-lottery-numbers.html");
let html = "";
try {
  accessSync(htmlPath);
  html = readFileSync(htmlPath, "utf8");
  check("built guide HTML exists", true);
} catch {
  check("built guide HTML exists", false);
}

if (html) {
  check(
    "H1 matches",
    html.includes(
      "<h1>Quick Pick vs. Choosing Your Own Lottery Numbers: Does Either Have Better Odds?</h1>",
    ),
  );
  check(
    "document title uses SEO candidate",
    html.includes(
      "<title>Quick Pick vs. Your Own Lottery Numbers: Does Either Have Better Odds? | Lottery Number Lab</title>",
    ),
  );
  check(
    "meta description",
    html.includes(
      'content="Quick Pick and self-chosen lottery numbers have the same odds. Learn what random selection changes, what it does not, and how popular picks may affect prize sharing."',
    ),
  );
  check(
    "canonical URL",
    html.includes(
      'rel="canonical" href="https://lotterynumberlab.com/guides/quick-pick-vs-choosing-your-own-lottery-numbers.html"',
    ),
  );
  check("Article JSON-LD present", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD present", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD present", html.includes('"@type":"BreadcrumbList"'));

  check("direct answer: neither better drawing odds", /Neither Quick Pick nor choosing your own numbers has better drawing odds/i.test(html));
  check("selection method ≠ drawing probability", /Selection method is not drawing probability/i.test(html));
  check("valid QP = valid manual", /valid Quick Pick[\s\S]{0,80}valid manual/i.test(html));

  // Odds parity
  check("MM odds figure present", html.includes("290,472,336") || html.includes("1 in 290,472,336"));
  check("PB odds figure present", html.includes("292,201,338") || html.includes("1 in 292,201,338"));
  check("same-odds table says Same / Same for jackpot", /Jackpot odds for one valid line[\s\S]{0,120}Same[\s\S]{0,40}Same/i.test(html));
  check("QP odds = manual phrasing", /Quick Pick or manual/i.test(html));
  check("$5 and $2 prices", html.includes("$5") && html.includes("$2"));

  // Concept split
  check("drawing probability concept", /Drawing probability/i.test(html));
  check("selection method concept", /Selection method/i.test(html));
  check("prize-sharing risk concept", /Prize-sharing risk/i.test(html));
  check("sharing ≠ draw odds", /Sharing is separate from draw odds/i.test(html) || /separate from draw odds/i.test(html));

  // Myths / guards
  check("no unsupported most-winners QP %", !/most (jackpot )?winners used Quick Pick/i.test(html));
  check("rejects unsupported winner %", /does <strong>not<\/strong> publish an unsupported/i.test(html) || /Without primary sales-mix data/i.test(html));
  check("birthday NOT lower draw odds", /are\s+<strong>not<\/strong>\s+lower-probability combinations/i.test(html));
  check(
    "no claim numbers >31 drawn more (as odds boost)",
    /Do not claim that numbers above 31/i.test(html),
  );
  check("independent trials linked for past winners", html.includes('href="independent-trials.html"'));
  check("generators not prediction", /not a prediction or recommendation/i.test(html) || /not predictions, recommendations/i.test(html));
  check("generator CTA convenience not prediction", /convenience, not prediction/i.test(html) || /for convenience, not prediction/i.test(html));

  // Multi-ticket consistency
  check("distinct combinations matter", /distinct<\/strong> valid combinations/i.test(html) || /distinct valid combinations/i.test(html));
  check("duplicates do not raise draw chance", /Duplicates[\s\S]{0,80}do not raise the chance/i.test(html));
  check("links more-tickets", html.includes('href="does-buying-more-lottery-tickets-improve-your-odds.html"'));
  check("links shared-jackpot", html.includes('href="what-happens-when-multiple-people-win-the-lottery-jackpot.html"'));

  // No strategy / purchase CTAs / crowning
  check("no purchase CTA", !/buy tickets now/i.test(html) && !/purchase tickets/i.test(html) && !/play now/i.test(html));
  check("does not crown a winner method", /Do not crown either method/i.test(html));
  check("pros as convenience only", /convenience reasons \u2014 not a strategy claim/i.test(html) || /convenience reasons — not a strategy claim/i.test(html));

  // QP definition from sources
  check("Easy Pick/Quick Pick official wording", /Easy Pick\/Quick Pick/i.test(html));
  check("terminal/system random select", /randomly select/i.test(html));

  const mustLinks = [
    "../mega-millions.html",
    "../powerball.html",
    "../tools/odds-explorer.html",
    "does-buying-more-lottery-tickets-improve-your-odds.html",
    "what-happens-when-multiple-people-win-the-lottery-jackpot.html",
    "independent-trials.html",
    "hot-and-cold-numbers-tested.html",
    "how-lottery-odds-are-calculated.html",
    "../responsible-play.html",
  ];
  for (const href of mustLinks) {
    check(`internal link ${href}`, html.includes(`href="${href}"`));
  }

  check("visible FAQ present", html.includes('id="faq"') && html.includes("Does Quick Pick have better jackpot odds"));
  check("FAQ count at least 4", (html.match(/<dt>/g) || []).length >= 4);
  check("adsense meta present", html.includes('name="google-adsense-account" content="ca-pub-9237217026636557"'));
  check("no ad-slot placeholder", !html.includes('class="ad-slot"'));
  check("table-wrap present", html.includes("table-wrap"));
  check("comparison + same-odds tables", html.includes("Who selects the line?") && html.includes("Jackpot odds (one valid line)"));
  check("sources dated Sep 27 2026", /September 27, 2026/i.test(html));
}

const sitemap = readFileSync(resolve(ROOT, "sitemap.xml"), "utf8");
check(
  "sitemap includes new guide",
  sitemap.includes(
    "https://lotterynumberlab.com/guides/quick-pick-vs-choosing-your-own-lottery-numbers.html",
  ),
);

const hub = readFileSync(resolve(ROOT, "guides/index.html"), "utf8");
check("guides hub says Sixteen guides", hub.includes("Sixteen guides covering"));
check("guides hub has no leftover Eleven guides", !hub.includes("Eleven guides covering"));
check("guides hub has no leftover Thirteen guides", !hub.includes("Thirteen guides covering"));
check(
  "guides hub lists new guide card",
  hub.includes("quick-pick-vs-choosing-your-own-lottery-numbers.html"),
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nquick-pick guide checks passed");
