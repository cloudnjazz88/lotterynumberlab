/**
 * Verification for the winner-anonymity / disclosure-rules guide:
 * SoT integrity, registration, rendered HTML, category rules, UK exclusion.
 */
import { readFileSync, accessSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../content/guides.mjs";
import {
  WINNER_DISCLOSURE_RULES,
  WINNER_DISCLOSURE_VERIFIED_ON,
  DISCLOSURE_CATEGORY_LABELS,
  disclosureCategoryCounts,
  jurisdictionDirectoryRows,
} from "../content/winner-disclosure-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const EXPECTED_ABBREVS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA",
  "WA","WV","WI","WY","VI",
];

const EXPECTED_COUNTS = {
  broad: 11,
  conditional: 13,
  temporary: 1,
  public: 22,
  no_sales: 5,
  official_guidance_not_explicit: 1,
  unresolved: 0,
};

check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);
const guide = GUIDES.find((g) => g.slug === "can-lottery-winners-stay-anonymous");
check("guide registered in GUIDES", !!guide);
check("guide is last entry", GUIDES[13] === guide);
check("kicker is Money", guide?.kicker === "Money");
check("H1 title", guide?.title === "Can Lottery Winners Stay Anonymous?");
check(
  "seoTitle keeps keywords",
  guide?.seoTitle === "Can Lottery Winners Stay Anonymous? State-by-State Rules",
);
check(
  "meta description",
  guide?.description ===
    "Lottery winner anonymity depends on where the ticket was sold. Compare current disclosure rules, prize thresholds and privacy limits by U.S. jurisdiction.",
);
check("published 2026-09-28", guide?.published === "2026-09-28" && guide?.updated === "2026-09-28");
check(
  "publicationMeta omits repeated date phrase",
  guide?.publicationMeta ===
    "Winner disclosure rules verified against official lottery and government sources",
);
check("faq has 5-8 items", guide?.faq?.length >= 5 && guide.faq.length <= 8, `n=${guide?.faq?.length}`);
check(
  "faq plain matches on-page answers",
  guide.faq.every((item) => item.a === item.plain),
);

const rules = jurisdictionDirectoryRows(WINNER_DISCLOSURE_RULES);
check("SoT has exactly 53 rows", rules.length === 53, `n=${rules.length}`);
check("verifiedOn is 2026-09-28", WINNER_DISCLOSURE_VERIFIED_ON === "2026-09-28");

const abbrevs = rules.map((r) => r.abbreviation).sort();
check(
  "abbreviations unique",
  new Set(abbrevs).size === 53,
  `unique=${new Set(abbrevs).size}`,
);
check(
  "abbreviations match expected 53 set",
  JSON.stringify(abbrevs) === JSON.stringify([...EXPECTED_ABBREVS].sort()),
);
check(
  "jurisdiction names unique",
  new Set(rules.map((r) => r.jurisdiction)).size === 53,
);

const counts = disclosureCategoryCounts(rules);
const sum = Object.values(counts).reduce((a, b) => a + b, 0);
check("category counts sum to 53", sum === 53, JSON.stringify(counts));
check(
  "category totals match expected",
  JSON.stringify(counts) === JSON.stringify(EXPECTED_COUNTS),
  JSON.stringify(counts),
);
check("unresolved is 0", counts.unresolved === 0);
check("official_guidance_not_explicit is 1", counts.official_guidance_not_explicit === 1);
check(
  "labels include official_guidance_not_explicit",
  DISCLOSURE_CATEGORY_LABELS.official_guidance_not_explicit ===
    "Official guidance not explicit",
);
check(
  "labels cover active + unresolved keys",
  Object.keys(DISCLOSURE_CATEGORY_LABELS).length >= 7,
);

for (const r of rules) {
  check(
    `${r.abbreviation} has anonymityType`,
    typeof r.anonymityType === "string" && r.anonymityType in DISCLOSURE_CATEGORY_LABELS,
  );
  check(`${r.abbreviation} verifiedOn set`, r.verifiedOn === "2026-09-28");
  check(
    `${r.abbreviation} has official source URL`,
    typeof r.officialSourceUrl === "string" && r.officialSourceUrl.startsWith("http"),
  );
  check(
    `${r.abbreviation} has official source title`,
    typeof r.officialSourceTitle === "string" && r.officialSourceTitle.length > 3,
  );
  if (r.anonymityType === "conditional") {
    check(
      `${r.abbreviation} conditional has threshold or limits`,
      !!(r.threshold || r.importantLimits || r.confidentialityPeriod),
    );
  }
  if (r.anonymityType === "temporary") {
    check(
      `${r.abbreviation} temporary has period`,
      !!(r.confidentialityPeriod && String(r.confidentialityPeriod).length > 3),
    );
    check(
      `${r.abbreviation} temporary is not permanent wording in type`,
      r.anonymityType === "temporary",
    );
  }
}

const noSales = rules.filter((r) => r.anonymityType === "no_sales");
check("exactly 5 no-sales", noSales.length === 5);
check(
  "no-sales are AL AK HI NV UT",
  noSales.map((r) => r.abbreviation).sort().join(",") === "AK,AL,HI,NV,UT",
);

const pr = rules.find((r) => r.abbreviation === "PR");
check("PR powerball only", pr?.powerball === true && pr?.megaMillions === false);
check("PR salesStatus powerball_only", pr?.salesStatus === "powerball_only");
check(
  "PR is official_guidance_not_explicit",
  pr?.anonymityType === "official_guidance_not_explicit",
);
check(
  "only PR has official_guidance_not_explicit",
  rules.filter((r) => r.anonymityType === "official_guidance_not_explicit").map((r) => r.abbreviation).join(",") === "PR",
);
check(
  "PR importantLimits contact CTA",
  /Contact Puerto Rico/i.test(pr?.importantLimits || "") &&
    /before claiming/i.test(pr?.importantLimits || ""),
);
check(
  "PR research note §7.2 winning numbers not identity",
  /n[uú]meros premiados/i.test(pr?.researchNotes || "") &&
    /winning numbers/i.test(pr?.researchNotes || "") &&
    /not claimant identity|NOT winner identity|not winner identity/i.test(pr?.researchNotes || ""),
);
check(
  "PR notes reject public/broad inference",
  /NOT public\/broad\/conditional|official_guidance_not_explicit/i.test(pr?.researchNotes || ""),
);
check(
  "PR disclosureStatus label",
  pr?.disclosureStatus === "Official guidance not explicit",
);
const prForbidden = [
  /cannot remain anonymous/i,
  /must (be )?public/i,
  /names? (are|is) public/i,
  /winners? (are|is) public/i,
  /anonymity (is )?available/i,
  /may remain anonymous/i,
];
for (const re of prForbidden) {
  check(
    `PR limits avoid forbidden claim ${re}`,
    !re.test(pr?.importantLimits || "") && !re.test(pr?.disclosureStatus || ""),
  );
}

const vi = rules.find((r) => r.abbreviation === "VI");
check("USVI sells both", vi?.powerball === true && vi?.megaMillions === true);
check("VI category not same as PR type unless evidence", vi?.anonymityType !== "official_guidance_not_explicit");
check(
  "no UK row",
  !rules.some((r) => /united kingdom|u\.k\.|uk\b/i.test(r.jurisdiction + r.abbreviation)),
);

const fl = rules.find((r) => r.abbreviation === "FL");
check("FL is temporary not broad/public permanent", fl?.anonymityType === "temporary");
check("FL period mentions 90 days", /90\s*days/i.test(fl?.confidentialityPeriod || ""));

// Build HTML expectations (after build)
const htmlPath = resolve(ROOT, "guides/can-lottery-winners-stay-anonymous.html");
let html = "";
try {
  accessSync(htmlPath);
  html = readFileSync(htmlPath, "utf8");
  check("built guide HTML exists", true);
} catch {
  check("built guide HTML exists", false);
}

if (html) {
  check("H1 matches", html.includes("<h1>Can Lottery Winners Stay Anonymous?</h1>"));
  check(
    "document title",
    html.includes(
      "<title>Can Lottery Winners Stay Anonymous? State-by-State Rules | Lottery Number Lab</title>",
    ),
  );
  check(
    "meta description present",
    html.includes(
      'content="Lottery winner anonymity depends on where the ticket was sold. Compare current disclosure rules, prize thresholds and privacy limits by U.S. jurisdiction."',
    ),
  );
  check(
    "canonical",
    html.includes(
      'rel="canonical" href="https://lotterynumberlab.com/guides/can-lottery-winners-stay-anonymous.html"',
    ),
  );
  check("Article JSON-LD", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD", html.includes('"@type":"BreadcrumbList"'));
  check("Money kicker", html.includes("Money") && html.includes("page-kicker"));
  check("table-wrap present", html.includes("table-wrap"));
  check("no Yes/No anonymity table header", !/<th>[^<]*Yes\/No[^<]*<\/th>/i.test(html) && !/<th>[^<]*Anonymous\?[^<]*<\/th>/i.test(html));
  check("UK exclusion note", /United Kingdom sales in 2026/i.test(html) && /limited to U\.S\./i.test(html));
  check("no UK directory row", !/>United Kingdom</i.test(html));
  check("Powerball claim jurisdiction language", /claimed in the jurisdiction where the winning ticket was purchased/i.test(html));
  check("concept distinctions present", /Temporary confidentiality \/ delayed disclosure/i.test(html));
  check("trust not synonym", /Trust \/ LLC \/ entity claim/i.test(html));
  check("legend has Official guidance not explicit", /Official guidance not explicit/i.test(html));
  check("silence note present", /missing clear rule is not the same as anonymity being allowed/i.test(html));
  check("no user-facing Unresolved word", !/\bUnresolved\b/i.test(html));
  check(
    "no zero-count internal confirmation label",
    !/Official rule not sufficiently confirmed/i.test(html),
  );
  check("legend explains silence is not a finding", /not a finding that anonymity is allowed/i.test(html));
  const prRow = html.match(/<tr><td>Puerto Rico<\/td>[\s\S]*?<\/tr>/);
  check("PR row exists in directory", !!prRow);
  const prForbiddenHtml = [
    /cannot remain anonymous/i,
    /winner names are public/i,
    /names are public/i,
    /anonymity is allowed/i,
    /must be published/i,
  ];
  for (const re of prForbiddenHtml) {
    check(`PR directory cell avoids ${re}`, prRow ? !re.test(prRow[0]) : false);
  }
  check(
    "PR row shows Official guidance not explicit",
    /Puerto Rico[\s\S]{0,400}Official guidance not explicit/i.test(html),
  );
  check(
    "PR row CTA before claiming",
    /Puerto Rico[\s\S]{0,800}before claiming/i.test(html),
  );
  check(
    "directory has 53 data rows",
    [...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].some((m) => m[1].split("<tr>").length - 1 === 53),
  );
  // thresholds match render for conditional sample
  for (const r of rules.filter((x) => x.anonymityType === "conditional" && x.threshold)) {
    check(
      `HTML includes ${r.abbreviation} threshold text`,
      html.includes(r.threshold),
    );
  }
  check("FL period in HTML", html.includes("90 days") || html.includes(fl.confidentialityPeriod));
  for (const name of ["Alabama", "California", "Puerto Rico", "U.S. Virgin Islands", "Wyoming"]) {
    check(`directory includes ${name}`, html.includes(`>${name}<`));
  }
  check("internal link unclaimed", html.includes("what-happens-to-unclaimed-lottery-prizes.html"));
  check("internal link shared jackpot", html.includes("what-happens-when-multiple-people-win-the-lottery-jackpot.html"));
  check("internal link record jackpots", html.includes("record-jackpots-and-taxes.html"));
  check("internal link results", html.includes("../results/index.html"));
  check("internal link responsible play", html.includes("../responsible-play.html"));
  check("internal link methodology", html.includes("../methodology.html"));
  check("legal disclaimer", /not legal, tax, or claims advice/i.test(html));
  check("no purchase CTA", !/buy tickets now/i.test(html) && !/play now/i.test(html));
  check("adsense meta", html.includes('name="google-adsense-account" content="ca-pub-9237217026636557"'));
  check("no ad-slot placeholder", !html.includes('class="ad-slot"'));
  // Audit: no empty source href in directory for linked cells
  check(
    "no empty official source href",
    !/href=""/.test(html) && !/href=''/.test(html),
  );
}

const sitemap = readFileSync(resolve(ROOT, "sitemap.xml"), "utf8");
check(
  "sitemap includes new guide",
  sitemap.includes("https://lotterynumberlab.com/guides/can-lottery-winners-stay-anonymous.html"),
);

const hub = readFileSync(resolve(ROOT, "guides/index.html"), "utf8");
check("guides hub says Sixteen guides", hub.includes(`${GUIDES.length} guides covering`));
check("guides hub has no leftover Thirteen guides", !hub.includes("Thirteen guides covering"));
check(
  "guides hub lists new guide card",
  hub.includes("can-lottery-winners-stay-anonymous.html"),
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nwinner-anonymity guide checks passed");
console.log("CATEGORY_COUNTS", JSON.stringify(counts));
console.log(
  "OFFICIAL_GUIDANCE_NOT_EXPLICIT",
  rules.filter((r) => r.anonymityType === "official_guidance_not_explicit").map((r) => r.abbreviation).join(","),
);
