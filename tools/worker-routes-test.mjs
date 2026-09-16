import { htmlAliasFor, isExtensionlessPath } from "./worker-routes.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

check("/powerball is extensionless", isExtensionlessPath("/powerball"));
check("/mega-millions is extensionless", isExtensionlessPath("/mega-millions"));
check("/guides/faq is extensionless", isExtensionlessPath("/guides/faq"));
check("/powerball.html is not", !isExtensionlessPath("/powerball.html"));
check("/styles.css is not", !isExtensionlessPath("/styles.css"));
check("/ is not", !isExtensionlessPath("/"));
check("/guides/ trailing is not", !isExtensionlessPath("/guides/"));

check("/powerball → powerball.html", htmlAliasFor("/powerball") === "/powerball.html");
check("/mega-millions → .html", htmlAliasFor("/mega-millions") === "/mega-millions.html");
check("/faq → faq.html", htmlAliasFor("/faq") === "/faq.html");
check("/about → about.html", htmlAliasFor("/about") === "/about.html");
check("/terms → terms.html", htmlAliasFor("/terms") === "/terms.html");
check("/methodology → .html", htmlAliasFor("/methodology") === "/methodology.html");
check("/responsible-play → .html", htmlAliasFor("/responsible-play") === "/responsible-play.html");
check("/glossary → .html", htmlAliasFor("/glossary") === "/glossary.html");
check(
  "/guides/how-lottery-odds-are-calculated → .html",
  htmlAliasFor("/guides/how-lottery-odds-are-calculated") ===
    "/guides/how-lottery-odds-are-calculated.html",
);
check(
  "/guides/mega-millions-vs-powerball-odds → .html",
  htmlAliasFor("/guides/mega-millions-vs-powerball-odds") ===
    "/guides/mega-millions-vs-powerball-odds.html",
);
check("/powerball/ trailing → .html", htmlAliasFor("/powerball/") === "/powerball.html");
check("/guides/ trailing → guides.html candidate", htmlAliasFor("/guides/") === "/guides.html");
check("/powerball.html has no alias", htmlAliasFor("/powerball.html") === null);
check("/styles.css has no alias", htmlAliasFor("/styles.css") === null);
check("/ has no alias", htmlAliasFor("/") === null);

const gsc = [
  "/powerball",
  "/mega-millions",
  "/faq",
  "/about",
  "/terms",
  "/methodology",
  "/responsible-play",
  "/glossary",
  "/guides/how-lottery-odds-are-calculated",
  "/guides/mega-millions-vs-powerball-odds",
  "/guides/what-winning-combinations-look-like",
  "/guides/expected-value-of-a-lottery-ticket",
  "/guides/independent-trials",
  "/guides/powerball-2015-rule-change",
  "/guides/mega-millions-2025-rule-change",
  "/guides/record-jackpots-and-taxes",
  "/guides/hot-and-cold-numbers-tested",
];
for (const path of gsc) {
  check(`${path} maps to existing build file name`, htmlAliasFor(path) === `${path}.html`);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall worker-route checks passed");
