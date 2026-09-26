/**
 * Analyze hub — entry point to game dashboards and key analysis guides.
 */

import { adSlot, link } from "./site.mjs";

export function analyzeHub(ctx, guides) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const picks = [
    "independent-trials",
    "hot-and-cold-numbers-tested",
    "mega-millions-vs-powerball-odds",
    "what-winning-combinations-look-like",
    "expected-value-of-a-lottery-ticket",
    "how-lottery-odds-are-calculated",
  ];
  const featured = picks
    .map((slug) => guides.find((g) => g.slug === slug))
    .filter(Boolean);

  return `      <section class="hero hero--compact hero--page">
        <p class="hero__eyebrow">Analyze</p>
        <h1>Analyze Mega Millions and Powerball</h1>
        <p class="hero__lead">
          Start from the live dashboards or the guides that explain what the history
          can — and cannot — tell you.
        </p>
      </section>

      <section class="panel" aria-labelledby="dashboards-heading">
        <h2 class="section__title" id="dashboards-heading">Game dashboards</h2>
        <p class="section__lead">
          Latest results, frequencies, dry spells, and optional generators. Generators
          explore the data; they do not improve odds.
        </p>
        <div class="game-cards">
          <a class="game-card" href="${link("mega-millions.html", 1)}" data-game="megamillions">
            <div class="game-card__head">
              <span class="game-card__mark">MM</span>
              <div>
                <h3>Mega Millions</h3>
                <p>${mm.config.matrixLabel} · ${mm.config.ticketPrice} per play</p>
              </div>
            </div>
            <p class="game-card__label">${mm.history.count.toLocaleString("en-US")} drawings analysed</p>
            <span class="game-card__cta">Open Mega Millions dashboard <span aria-hidden="true">→</span></span>
          </a>
          <a class="game-card" href="${link("powerball.html", 1)}" data-game="powerball">
            <div class="game-card__head">
              <span class="game-card__mark">PB</span>
              <div>
                <h3>Powerball</h3>
                <p>${pb.config.matrixLabel} · ${pb.config.ticketPrice} per play</p>
              </div>
            </div>
            <p class="game-card__label">${pb.history.count.toLocaleString("en-US")} drawings analysed</p>
            <span class="game-card__cta">Open Powerball dashboard <span aria-hidden="true">→</span></span>
          </a>
        </div>
      </section>

      <section class="panel panel--warm" aria-labelledby="guides-heading">
        <h2 class="section__title" id="guides-heading">Key analysis guides</h2>
        <ul class="analysis-feature__related analysis-feature__related--alone">
          ${featured
            .map(
              (g) => `<li>
            <a href="${link(`guides/${g.slug}.html`, 1)}">
              <strong>${g.title}</strong>
              <span>${g.dek}</span>
            </a>
          </li>`,
            )
            .join("")}
        </ul>
        <p class="section__after">
          <a class="text-link" href="${link("guides/index.html", 1)}">All guides →</a>
        </p>
      </section>

      ${adSlot("analyze-hub")}
`;
}
