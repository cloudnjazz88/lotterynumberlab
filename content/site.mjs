/**
 * Site-wide configuration and the HTML shell every page is rendered into.
 *
 * ACTION REQUIRED before you publish: fill in `url`, `email` and — once your
 * AdSense account is approved — `adsensePublisherId`. The build prints a
 * reminder for anything still left at its placeholder value.
 */

export const SITE = {
  name: "Lottery Number Lab",
  shortName: "Lottery Number Lab",
  tagline: "Odds, drawing history and probability for Mega Millions and Powerball",
  url: "https://lotterynumberlab.com",
  email: "contact@lotterynumberlab.com",
  /** Your name or the name you publish under. Shown on About. Do not leave blank before applying to AdSense. */
  operatorName: "Lottery Num Lab",
  location: "the United States",
  adsensePublisherId: "",
  gaMeasurementId: "G-KG9C04QZWT",
  locale: "en_US",
  established: "2026",
  timeZoneNote: "All drawing dates and times on this site are US Eastern Time (ET).",
};

export const PLACEHOLDERS = {
  url: "https://your-domain.example",
  email: "hello@your-domain.example",
  adsensePublisherId: "",
  operatorName: "",
};

/* --------------------------- formatting helpers --------------------------- */

export const num = (value, digits = 0) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export const oneIn = (value) =>
  `1 in ${Number(value).toLocaleString("en-US", { maximumFractionDigits: value < 1000 ? 2 : 0 })}`;

export const money = (value) => `$${num(value)}`;

export const billions = (value) => `$${(value / 1e9).toFixed(2)} billion`;

export const dateLong = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/** Renders a simple data table. `rows` is an array of arrays of cell HTML. */
export function table(head, rows, options = {}) {
  const caption = options.caption ? `<caption>${options.caption}</caption>` : "";
  const cls = options.className ? ` class="${options.className}"` : "";
  return `<div class="table-wrap"><table${cls}>${caption}
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n  ")}</tbody></table></div>`;
}

export function callout(title, body, kind = "note") {
  return `<aside class="callout callout--${kind}">
  <h3>${title}</h3>
  ${body}
</aside>`;
}

/* ------------------------------ page chrome ------------------------------- */

const NAV = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "megamillions", label: "Mega Millions", href: "mega-millions.html" },
  { id: "powerball", label: "Powerball", href: "powerball.html" },
  { id: "results", label: "Results", href: "results/index.html" },
  { id: "guides", label: "Guides", href: "guides/index.html" },
  { id: "about", label: "About", href: "about.html" },
];

const FOOTER_LINKS = [
  { label: "Mega Millions numbers", href: "mega-millions.html" },
  { label: "Powerball numbers", href: "powerball.html" },
  { label: "Past winning numbers", href: "results/index.html" },
  { label: "All guides", href: "guides/index.html" },
  { label: "FAQ", href: "faq.html" },
  { label: "Glossary", href: "glossary.html" },
  { label: "Methodology & corrections", href: "methodology.html" },
  { label: "About & contact", href: "about.html" },
  { label: "Privacy policy", href: "privacy-policy.html" },
  { label: "Terms & disclaimer", href: "terms.html" },
  { label: "Responsible play", href: "responsible-play.html" },
];

/** Official documents the written pages are checked against. */
export const SOURCES = {
  mmHome: { label: "Mega Millions — official site", url: "https://www.megamillions.com/" },
  mmHowTo: { label: "Mega Millions — How to Play and prize tiers", url: "https://www.megamillions.com/How-to-Play.aspx" },
  mmDrawings: { label: "Mega Millions — previous drawings", url: "https://www.megamillions.com/Winning-Numbers/Previous-Drawings.aspx" },
  mm2025: { label: "Mega Millions — “New Mega Millions arrives in April” (2025 game change)", url: "https://www.megamillions.com/News/2025/New-Mega-Millions%C2%AE-arrives-in-April.aspx" },
  mm2025md: { label: "Maryland Lottery — Mega Millions game changes, including the full 2025 prize matrix", url: "https://www.mdlottery.com/games/mega-millions/changes/" },
  pbHome: { label: "Powerball — official site", url: "https://www.powerball.com/" },
  pbPrizes: { label: "Powerball — prize chart and official odds", url: "https://www.powerball.com/powerball-prize-chart" },
  pbResults: { label: "Powerball — previous results", url: "https://www.powerball.com/previous-results" },
  pb2015: { label: "Nebraska Lottery — fact sheet on the October 2015 Powerball changes (old and new prize structures)", url: "https://nelottery.com/media/powerball_factsheet7_15.pdf" },
  pb2015la: { label: "Louisiana Lottery — “Powerball’s matrix changes to build bigger jackpots”", url: "https://louisianalottery.com/powerballs-matrix-changes-to-build-bigger-jackpots/" },
  musl: { label: "Multi-State Lottery Association (MUSL)", url: "https://www.musl.com/" },
  nyMega: { label: "New York State Open Data — Mega Millions winning numbers", url: "https://data.ny.gov/d/5xaw-6ayf" },
  nyPower: { label: "New York State Open Data — Powerball winning numbers", url: "https://data.ny.gov/d/d6yy-54nr" },
  irsGambling: { label: "IRS — Topic no. 419, gambling income and losses", url: "https://www.irs.gov/taxtopics/tc419" },
  irsW2G: { label: "IRS — About Form W-2 G, certain gambling winnings", url: "https://www.irs.gov/forms-pubs/about-form-w-2-g" },
  irsBrackets: { label: "IRS — federal income tax rates and brackets", url: "https://www.irs.gov/filing/federal-income-tax-rates-and-brackets" },
  jackpotRecords: { label: "Lottery jackpot records (compiled list of every US jackpot over $1 billion)", url: "https://en.wikipedia.org/wiki/Lottery_jackpot_records" },
  winFall: { label: "Cash WinFall — the roll-down game that was briefly beatable", url: "https://en.wikipedia.org/wiki/Cash_WinFall" },
  ncpg: { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
};

/** Renders the "Sources" block that closes every guide. */
export function sourceList(keys, depth) {
  const items = keys
    .map((key) => {
      const source = SOURCES[key];
      return `  <li><a href="${source.url}" target="_blank" rel="noopener nofollow">${source.label}</a></li>`;
    })
    .join("\n");
  return `<section class="sources">
  <h2>Sources</h2>
  <p>
    Figures on this page are computed from the published game rules and the drawing record.
    These are the documents they are checked against — see
    <a href="${link("methodology.html", depth)}">our methodology and corrections policy</a> for
    how that is done.
  </p>
  <ul>
${items}
  </ul>
</section>`;
}

/** The disclaimer that appears verbatim wherever numbers are generated. */
export const CORE_DISCLAIMER = `The numbers this site produces are reference figures for
<strong>entertainment purposes only</strong>, based on historical statistics and a random
sampling algorithm. Every lottery drawing is a perfectly independent event, so nothing here
guarantees or improves a win. Please do not buy lottery tickets excessively.`;

export const SHORT_DISCLAIMER = `Entertainment and statistics only. No method can improve
your odds of winning. 18+ (21+ in some states).`;

function prefix(depth) {
  return depth > 0 ? "../".repeat(depth) : "";
}

export function link(href, depth) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  return prefix(depth) + href;
}

function nav(active, depth) {
  return NAV.map(
    (item) =>
      `<a href="${link(item.href, depth)}"${item.id === active ? ' class="is-on" aria-current="page"' : ""}>${item.label}</a>`,
  ).join("\n        ");
}

function adsenseHead() {
  if (!SITE.adsensePublisherId) return "";
  return `
    <meta name="google-adsense-account" content="${SITE.adsensePublisherId}" />
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsensePublisherId}"
      crossorigin="anonymous"
    ></script>`;
}

function analyticsHead() {
  if (!SITE.gaMeasurementId) return "";
  const id = SITE.gaMeasurementId;
  return `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    </script>`;
}

/** Reserved ad container. Renders nothing until a publisher ID is configured. */
export function adSlot(label = "") {
  if (!SITE.adsensePublisherId) return "";
  return `<div class="ad-slot"${label ? ` data-slot="${label}"` : ""}>
  <ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.adsensePublisherId}"
    data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

const stripTags = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function breadcrumbLd(page, base) {
  const pageUrl = `${base}/${page.slug.replace(/index\.html$/, "")}`;
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: `${base}/` }];

  if (page.slug.startsWith("guides/")) {
    items.push({ "@type": "ListItem", position: 2, name: "Guides", item: `${base}/guides/` });
    if (page.slug !== "guides/index.html") {
      items.push({ "@type": "ListItem", position: 3, name: page.title, item: pageUrl });
    }
  } else if (page.slug.startsWith("results/")) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "Winning numbers",
      item: `${base}/results/`,
    });
    if (page.slug !== "results/index.html") {
      items.push({ "@type": "ListItem", position: 3, name: page.title, item: pageUrl });
    }
  } else if (page.slug !== "index.html") {
    items.push({ "@type": "ListItem", position: 2, name: page.title, item: pageUrl });
  }

  if (items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function jsonLd(page, depth) {
  const base = SITE.url.replace(/\/$/, "");
  const pageUrl = `${base}/${page.slug}`;
  const blocks = [];

  if (page.kind === "guide") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      description: page.description,
      datePublished: page.published,
      dateModified: page.updated || page.published,
      author: { "@type": "Organization", name: SITE.name },
      publisher: { "@type": "Organization", name: SITE.name },
      mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
      isAccessibleForFree: true,
    });
  } else if (page.slug === "about.html") {
    const org = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: `${base}/`,
      email: SITE.email,
      description: SITE.tagline,
      contactPoint: {
        "@type": "ContactPoint",
        email: SITE.email,
        contactType: "editorial",
        availableLanguage: "en",
      },
    };
    if (SITE.operatorName) org.founder = { "@type": "Organization", name: SITE.operatorName };
    blocks.push(org);
  } else if (page.slug === "index.html") {
    const site = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: `${base}/`,
      description: page.description || SITE.tagline,
      inLanguage: "en-US",
      publisher: { "@type": "Organization", name: SITE.name, url: `${base}/` },
    };
    if (page.modified) site.dateModified = page.modified;
    blocks.push(site);
  } else if (page.view === "game") {
    const webpage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: pageUrl,
      isPartOf: { "@type": "WebSite", name: SITE.name, url: `${base}/` },
      about: page.game === "powerball" ? "Powerball" : "Mega Millions",
    };
    if (page.modified) webpage.dateModified = page.modified;
    blocks.push(webpage);
  }

  const crumbs = breadcrumbLd(page, base);
  if (crumbs) blocks.push(crumbs);

  if (page.faq) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.plain || stripTags(item.a) },
      })),
    });
  }

  if (page.dataset) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: page.dataset.name,
      description: page.description,
      url: pageUrl,
      temporalCoverage: page.dataset.coverage,
      creator: { "@type": "Organization", name: SITE.name },
      isAccessibleForFree: true,
    });
  }

  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join("\n    ");
}

export function layout(page) {
  const depth = page.slug.includes("/") ? page.slug.split("/").length - 1 : 0;
  const base = SITE.url.replace(/\/$/, "");
  const canonical = `${base}/${page.slug.replace(/index\.html$/, "")}`;
  const scripts = (page.scripts || [])
    .map((src) => `<script src="${link(src, depth)}"></script>`)
    .join("\n    ");

  const docTitle = page.title.includes(SITE.shortName) ? page.title : `${page.title} | ${SITE.shortName}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${docTitle}</title>
    <meta name="description" content="${page.description}" />
    <meta name="author" content="${SITE.name}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="${page.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}" />
    <meta property="og:type" content="${page.kind === "guide" ? "article" : "website"}" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:title" content="${docTitle}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="${SITE.locale}" />
    <meta name="twitter:card" content="${page.ogImage ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${docTitle}" />
    <meta name="twitter:description" content="${page.description}" />${
      page.ogImage
        ? `
    <meta property="og:image" content="${base}/${page.ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${page.title}" />
    <meta name="twitter:image" content="${base}/${page.ogImage}" />`
        : ""
    }
    <link rel="icon" href="${link("favicon.svg", depth)}" type="image/svg+xml" />
    <link rel="stylesheet" href="${link("styles.css", depth)}" />
    ${jsonLd(page, depth)}${adsenseHead()}${analyticsHead()}
  </head>
  <body data-view="${page.view || "page"}"${page.game ? ` data-game="${page.game}"` : ' data-game="home"'}>
    <div class="backdrop" aria-hidden="true"></div>
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="topbar">
      <a class="brand" href="${link("index.html", depth)}">
        <div class="brand-mark"><span>${page.game === "powerball" ? "PB" : page.game === "megamillions" ? "MM" : "US"}</span></div>
        <div class="brand-text">
          <span class="brand-name">${SITE.name}</span>
          <span class="brand-sub" id="brandSub">${page.brandSub || SITE.tagline}</span>
        </div>
      </a>
      <nav class="nav" aria-label="Main">
        ${nav(page.nav || page.game || "home", depth)}
      </nav>
    </header>

    <main id="main">
${page.body}
    </main>

    <footer class="footer">
      <div class="footer__cols">
        <div>
          <h2>${SITE.name}</h2>
          <p>${SITE.tagline}. ${SITE.timeZoneNote}</p>
        </div>
        <nav class="footer__links" aria-label="Footer">
          ${FOOTER_LINKS.map((l) => `<a href="${link(l.href, depth)}">${l.label}</a>`).join(
            "\n          ",
          )}
        </nav>
      </div>
      <p class="footer__disclaimer"><strong>Disclaimer.</strong> ${CORE_DISCLAIMER}</p>
      <p class="footer__warn">
        This site is an independent statistics project. It is not affiliated with, endorsed by
        or connected to the Mega Millions Consortium, the Multi-State Lottery Association
        (MUSL), or any state lottery. It does not sell lottery tickets and cannot pay prizes.
        Official results must always be verified with your state lottery.
        Play only where legal and only if you are old enough — 18+, or 21+ in some states.
        If gambling stops being fun, call 1-800-GAMBLER or visit
        <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener nofollow">ncpgambling.org</a>.
      </p>
      <p class="footer__meta">© ${SITE.established}–present ${SITE.name}. Drawing data from the
        New York State Open Data portal.</p>
    </footer>
    ${scripts}
  </body>
</html>
`;
}
