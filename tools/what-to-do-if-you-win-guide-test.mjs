/**
 * Verification for the claim-preparation checklist guide.
 * Confirms registration, approved wording, schema, and that this page
 * does not copy the anonymity directory or assert a national claim rule.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../content/guides.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const SLUG = "what-to-do-if-you-win-the-lottery";
const URL_PATH = `guides/${SLUG}.html`;
const CANONICAL = `https://lotterynumberlab.com/${URL_PATH}`;

const FAQ = [
  "What is the first thing to do after winning the lottery?",
  "Should I sign a winning lottery ticket immediately?",
  "Can I claim a Powerball or Mega Millions ticket in another state?",
  "Should I tell anyone before claiming?",
  "Do lottery taxes come out automatically?",
  "Can a trust claim the prize and keep me anonymous?",
  "How long do I have to claim?",
  "Does a lottery charge a fee before releasing a prize?",
];

check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);
const guide = GUIDES.find((g) => g.slug === SLUG);
check("guide registered", !!guide);
check("guide is last entry", GUIDES[14] === guide);
check("kicker is Money", guide?.kicker === "Money");
check("H1 title", guide?.title === "What Should You Do If You Win the Lottery?");
check(
  "seo title",
  guide?.seoTitle === "What to Do If You Win the Lottery: A Step-by-Step Checklist",
);
check(
  "meta description",
  guide?.description ===
    "Won a lottery prize? Follow a careful sequence to verify and protect the ticket, check claim rules, document shared ownership and prepare before claiming.",
);
check("published 2026-09-28", guide?.published === "2026-09-28");
check(
  "publicationMeta states the sources without repeating the date",
  guide?.publicationMeta ===
    "Checked against official Powerball, Mega Millions, IRS, FTC, and state-lottery claim guidance" &&
    !/2026-09-28|September 28/.test(guide?.publicationMeta || ""),
);
check("faq has 8 items", guide?.faq?.length === 8, `n=${guide?.faq?.length}`);
check(
  "faq questions match the approved list",
  JSON.stringify(guide?.faq?.map((item) => item.q)) === JSON.stringify(FAQ),
);
check(
  "faq plain matches visible answers",
  guide?.faq?.every((item) => item.a === item.plain),
);

const htmlPath = resolve(ROOT, URL_PATH);
check("generated page exists", existsSync(htmlPath));
const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";

if (html) {
  const h1s = html.match(/<h1[\s>]/g) || [];
  check("exactly one h1", h1s.length === 1, `n=${h1s.length}`);
  check("rendered H1", html.includes("<h1>What Should You Do If You Win the Lottery?</h1>"));
  check(
    "title",
    html.includes(
      "<title>What to Do If You Win the Lottery: A Step-by-Step Checklist | Lottery Number Lab</title>",
    ),
  );
  check("meta description", html.includes(`content="${guide.description}"`));
  check("canonical", html.includes(`rel="canonical" href="${CANONICAL}"`));
  check("og:title", html.includes('property="og:title"') && html.includes(guide.seoTitle));
  check("og:description", html.includes('property="og:description"') && html.includes(guide.description));
  check("Article JSON-LD", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD", html.includes('"@type":"BreadcrumbList"'));
  check("publication meta once, without a second date", html.includes(guide.publicationMeta) && !html.includes("Published September 28, 2026 · Checked against official Powerball, Mega Millions, IRS, FTC, and state-lottery claim guidance ·"));

  for (const q of FAQ) check(`FAQ visible: ${q.slice(0, 42)}`, html.includes(q));
  for (const item of guide.faq) {
    check(`FAQ answer visible: ${item.q.slice(0, 32)}`, html.includes(item.a));
  }

  const sources = [
    "https://www.powerball.com/faqs",
    "https://www.megamillions.com/faqs.aspx",
    "https://www.irs.gov/taxtopics/tc419",
    "https://www.irs.gov/forms-pubs/about-form-w-2-g",
    "https://consumer.ftc.gov/articles/fake-prize-sweepstakes-and-lottery-scams",
    "https://www.arizonalottery.com/winners/how-to-claim-prizes/",
    "https://www.palottery.pa.gov/palotterywebsite/media/misc/palotterywinnershandbook.pdf",
  ];
  for (const url of sources) check(`source ${url}`, html.includes(url));

  check(
    "claim where purchased",
    /prizes must be claimed in the jurisdiction where the winning ticket was purchased/i.test(html) &&
      /No\. Powerball and Mega Millions prizes must be claimed through the jurisdiction where the ticket was purchased/.test(html),
  );
  check(
    "deadline depends on the selling jurisdiction",
    html.includes("Claim periods are not uniform") &&
      html.includes("The deadline depends on the jurisdiction, game and sometimes prize type"),
  );
  check("does not copy the 53-jurisdiction directory", !html.includes("table--disclosure") && !html.includes("Official guidance not explicit") && !html.includes("Puerto Rico"));
  check("no nationwide sign-immediately rule", !/sign immediately/i.test(html));
  check("no trust-anonymity guarantee", !/a trust guarantees anonymity/i.test(html) && html.includes("not automatically the same as anonymity"));
  check(
    "withholding is not the final tax",
    html.includes("Federal withholding is not necessarily the final federal tax bill") &&
      !/federal withholding pays all tax/i.test(html) &&
      !/withholding equals the final/i.test(html),
  );
  check("do not publish the barcode", html.includes("Do not publish the ticket or barcode."));
  check(
    "document shared ownership",
    html.includes("Document any shared ownership before someone submits the claim.") &&
      html.includes("a written pool agreement"),
  );
  check("photograph is not a substitute for the original", html.includes("It is not normally a substitute for the original ticket."));
  check("no any-state claim assertion", !/claim in any participating state/i.test(html));
  check("no universal 180-day deadline", !/all states give winners 180 days/i.test(html) && !html.includes("180 days"));
  check("no photo-replaces-original assertion", !/a photo of the ticket replaces the original/i.test(html));

  const internal = [
    'href="can-lottery-winners-stay-anonymous.html"',
    'href="what-happens-to-unclaimed-lottery-prizes.html"',
    'href="what-happens-when-multiple-people-win-the-lottery-jackpot.html"',
    'href="record-jackpots-and-taxes.html"',
    'href="../tools/ticket-match-checker.html"',
    'href="../responsible-play.html"',
    'href="../methodology.html"',
  ];
  for (const href of internal) {
    check(`internal ${href}`, html.includes(href));
    const rel = href.match(/href="([^"]+)"/)[1].split("?")[0];
    check(`internal file exists ${rel}`, existsSync(resolve(ROOT, "guides", rel)));
  }

  check("numbered short version", html.includes("<h2>The short version</h2>") && html.includes("<ol>"));
  check("claim-preparation table", html.includes("<th>Question</th>") && html.includes("<th>Where to verify it</th>") && html.includes("table-wrap"));
  check("what not to do section", html.includes("<h2>What not to do</h2>"));
  check("previous guide is anonymity", html.includes('href="can-lottery-winners-stay-anonymous.html"') && html.includes(">Previous<"));
  check(
    "next guide is the lump-sum comparison",
    html.includes('article-nav__side--next" href="lottery-lump-sum-vs-annuity.html"'),
  );
  check("keep reading present", html.includes('id="more-guides"'));
  check("no user-facing Unresolved", !/\bUnresolved\b/.test(html));

  let anchorDepth = 0;
  let nested = false;
  for (const tag of html.matchAll(/<\/?a\b[^>]*>/gi)) {
    if (tag[0].startsWith("</")) anchorDepth = Math.max(0, anchorDepth - 1);
    else {
      if (anchorDepth > 0) nested = true;
      if (!/\/>\s*$/.test(tag[0])) anchorDepth += 1;
    }
  }
  check("no nested anchors", !nested);
}

const sitemap = existsSync(resolve(ROOT, "sitemap.xml")) ? readFileSync(resolve(ROOT, "sitemap.xml"), "utf8") : "";
check("sitemap includes the guide", sitemap.includes(CANONICAL));

const hub = existsSync(resolve(ROOT, "guides/index.html")) ? readFileSync(resolve(ROOT, "guides/index.html"), "utf8") : "";
check("guides hub says Sixteen guides", hub.includes(`${GUIDES.length} guides covering`));
check("guides hub has no leftover Fourteen guides", !hub.includes("Fourteen guides covering"));
check("guides hub card", hub.includes(`${SLUG}.html`));

const home = existsSync(resolve(ROOT, "index.html")) ? readFileSync(resolve(ROOT, "index.html"), "utf8") : "";
const analyze = existsSync(resolve(ROOT, "analyze/index.html")) ? readFileSync(resolve(ROOT, "analyze/index.html"), "utf8") : "";
const tools = existsSync(resolve(ROOT, "tools/index.html")) ? readFileSync(resolve(ROOT, "tools/index.html"), "utf8") : "";
check("not featured on home", !home.includes(SLUG));
check("not featured on analyze", !analyze.includes(SLUG));
check("not added to tools hub", !tools.includes(SLUG));

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nwhat-to-do-if-you-win guide checks passed");
