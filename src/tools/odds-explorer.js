/* Lottery Odds Explorer -- educational odds tool, client-side only. Not a predictor. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  function probabilityAtLeastOne(p, n) {
    const prob = Number(p);
    const trials = Number(n);
    if (!Number.isFinite(prob) || !Number.isFinite(trials)) return null;
    if (prob < 0 || prob > 1) return null;
    if (trials < 0) return null;
    if (trials === 0) return 0;
    if (prob === 0) return 0;
    if (prob === 1) return 1;
    if (trials === 1) return prob;
    return -Math.expm1(trials * Math.log1p(-prob));
  }

  function parsePositiveInt(value, min, max) {
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    if (n < min || n > max) return null;
    return n;
  }

  function formatProbability(p) {
    if (p == null || !Number.isFinite(p)) return { text: "--", oneIn: null };
    if (p <= 0) return { text: "0", oneIn: null };
    if (p >= 1) return { text: "100%", oneIn: 1 };
    const oneIn = 1 / p;
    const pct = p * 100;
    let text;
    // Display-only: never use scientific notation in user-facing odds text.
    if (pct >= 0.01) {
      text = pct.toFixed(2) + "%";
    } else {
      const decimals = Math.min(12, Math.max(4, Math.ceil(-Math.log10(pct)) + 3));
      text = pct.toFixed(decimals) + "%";
    }
    return { text, oneIn };
  }

  function formatOneIn(oneIn) {
    if (oneIn == null || !Number.isFinite(oneIn) || oneIn < 1) return null;
    // High probabilities: avoid "about 1 in 1.01" -- use N-in-100 phrasing.
    if (oneIn < 2) {
      const n = Math.min(99, Math.max(1, Math.round(100 / oneIn)));
      return "About a " + n + " in 100 chance";
    }
    if (oneIn >= 1000) return "About 1 in " + Math.round(oneIn).toLocaleString("en-US");
    if (oneIn >= 10) return "About 1 in " + oneIn.toFixed(1);
    return "About 1 in " + oneIn.toFixed(2);
  }

  function money(n) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  function loadData() {
    const el = document.getElementById("odds-explorer-data");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (_) {
      return null;
    }
  }

  function exploreOne(game, tickets, drawings) {
    const attempts = tickets * drawings;
    const jackpotP = 1 / game.jackpotOdds;
    const pJackpot = probabilityAtLeastOne(jackpotP, attempts);
    const pAny = probabilityAtLeastOne(game.anyPrize, attempts);
    const tiers = (game.tiers || []).map((row) => ({
      key: row.key,
      match: row.match,
      oneTicketOdds: row.oneIn,
      acrossAttempts: probabilityAtLeastOne(row.probability, attempts),
      expectedPer1M: row.probability * 1e6,
    }));
    return {
      ok: true,
      gameId: game.id,
      name: game.name,
      specialAbbr: game.specialAbbr,
      ticketPrice: game.ticketPrice,
      ticketPriceLabel: game.ticketPriceLabel,
      ticketsPerDrawing: tickets,
      drawings: drawings,
      totalTickets: attempts,
      estimatedSpend: game.ticketPrice * attempts,
      oneTicketJackpotOdds: game.jackpotOdds,
      pAtLeastOneJackpot: pJackpot,
      pAtLeastOnePrize: pAny,
      anyPrizeOneIn: game.anyPrizeOneIn,
      tiers: tiers,
    };
  }

  function interpretiveSentence(result) {
    const j = formatProbability(result.pAtLeastOneJackpot);
    const oneIn = formatOneIn(j.oneIn);
    const n = result.totalTickets.toLocaleString("en-US");
    const tag = result.gameId === "megamillions" ? "Mega Millions" : "Powerball";
    if (result.totalTickets === 1) {
      return (
        "One " +
        tag +
        " ticket has a " +
        j.text +
        " chance of the jackpot" +
        (oneIn ? " (" + oneIn + ")" : "") +
        " -- still an entertainment purchase, not an investment."
      );
    }
    return (
      "Even across " +
      n +
      " " +
      tag +
      " tickets, the chance of at least one jackpot is about " +
      j.text +
      (oneIn ? " (" + oneIn + ")" : "") +
      ". Cost scales with tickets; jackpot odds stay tiny."
    );
  }

  function freqContext(result) {
    const expected = result.pAtLeastOneJackpot * 1; // already across attempts
    const oneIn = formatOneIn(1 / result.pAtLeastOneJackpot);
    return (
      "Expected-frequency context only (not a guarantee): if you repeated this same " +
      result.totalTickets.toLocaleString("en-US") +
      "-ticket plan many times, jackpot hits would still be extremely rare" +
      (oneIn ? " -- " + oneIn + " plans on average" : "") +
      "."
    );
  }

  function tierTableHtml(result) {
    const rows = result.tiers
      .map((t) => {
        const across = formatProbability(t.acrossAttempts);
        const acrossOne = formatOneIn(across.oneIn);
        const exp =
          t.expectedPer1M >= 1
            ? t.expectedPer1M.toFixed(2)
            : t.expectedPer1M.toPrecision(3);
        return (
          "<tr>" +
          '<td data-label="Match pattern">' +
          t.match +
          "</td>" +
          '<td class="num" data-label="One-ticket odds">' +
          Math.round(t.oneTicketOdds).toLocaleString("en-US") +
          "</td>" +
          '<td class="num" data-label="Chance across attempts">' +
          across.text +
          (acrossOne ? '<span class="odds-sub"> (' + acrossOne + ")</span>" : "") +
          "</td>" +
          '<td class="num" data-label="Expected per 1M">' +
          exp +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    return (
      '<div class="table-wrap odds-tier-wrap">' +
      '<table class="odds-tier-table">' +
      "<caption>" +
      result.name +
      " prize-tier odds (pattern only -- prize dollars vary by multiplier and jurisdiction)</caption>" +
      "<thead><tr>" +
      "<th scope=\"col\">Match</th>" +
      "<th scope=\"col\">1 in</th>" +
      "<th scope=\"col\">Chance</th>" +
      "<th scope=\"col\">Per 1M</th>" +
      "</tr></thead><tbody>" +
      rows +
      "</tbody></table></div>"
    );
  }

  function gameCardHtml(result) {
    const jFmt = formatProbability(result.pAtLeastOneJackpot);
    const jOne = formatOneIn(jFmt.oneIn);
    const aFmt = formatProbability(result.pAtLeastOnePrize);
    const aOne = formatOneIn(aFmt.oneIn);
    return (
      '<section class="odds-game-card" data-game="' +
      result.gameId +
      '" aria-labelledby="odds-card-' +
      result.gameId +
      '">' +
      "<h3 id=\"odds-card-" +
      result.gameId +
      '">' +
      result.name +
      "</h3>" +
      '<dl class="odds-results__grid">' +
      "<div><dt>Ticket price</dt><dd class=\"num\">" +
      result.ticketPriceLabel +
      "</dd></div>" +
      "<div><dt>Total tickets</dt><dd class=\"num\">" +
      result.totalTickets.toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>Estimated spend</dt><dd class=\"num\">" +
      money(result.estimatedSpend) +
      "</dd></div>" +
      "<div><dt>One-ticket jackpot odds</dt><dd class=\"num\">1 in " +
      result.oneTicketJackpotOdds.toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>P(at least one jackpot)</dt><dd class=\"num\">" +
      jFmt.text +
      (jOne ? '<span class="odds-sub"> (' + jOne + ")</span>" : "") +
      "</dd></div>" +
      "<div><dt>P(at least one prize)</dt><dd class=\"num\">" +
      aFmt.text +
      (aOne ? '<span class="odds-sub"> (' + aOne + ")</span>" : "") +
      "</dd></div>" +
      "</dl>" +
      '<p class="odds-interpret">' +
      interpretiveSentence(result) +
      "</p>" +
      '<p class="odds-freq">' +
      freqContext(result) +
      "</p>" +
      tierTableHtml(result) +
      "</section>"
    );
  }

  function readInputs() {
    const modeBtn = document.querySelector(".odds-mode-btn.is-on");
    const mode = modeBtn ? modeBtn.getAttribute("data-mode") : "megamillions";
    const ticketsPreset = document.querySelector('.odds-tickets-btn.is-on');
    const drawingsPreset = document.querySelector('.odds-drawings-btn.is-on');
    let tickets;
    let drawings;
    if (ticketsPreset && ticketsPreset.getAttribute("data-value") === "custom") {
      tickets = parsePositiveInt(document.getElementById("odds-tickets-custom").value, 1, 1000);
    } else {
      tickets = parsePositiveInt(ticketsPreset && ticketsPreset.getAttribute("data-value"), 1, 1000);
    }
    if (drawingsPreset && drawingsPreset.getAttribute("data-value") === "custom") {
      drawings = parsePositiveInt(document.getElementById("odds-drawings-custom").value, 1, 1000);
    } else {
      drawings = parsePositiveInt(drawingsPreset && drawingsPreset.getAttribute("data-value"), 1, 1000);
    }
    return { mode, tickets, drawings };
  }

  function setPressed(groupSelector, active) {
    document.querySelectorAll(groupSelector).forEach((btn) => {
      const on = btn === active;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function toggleCustomVisibility() {
    const tCustom = document.querySelector('.odds-tickets-btn.is-on')?.getAttribute("data-value") === "custom";
    const dCustom = document.querySelector('.odds-drawings-btn.is-on')?.getAttribute("data-value") === "custom";
    const tField = document.getElementById("odds-tickets-custom-field");
    const dField = document.getElementById("odds-drawings-custom-field");
    if (tField) tField.hidden = !tCustom;
    if (dField) dField.hidden = !dCustom;
  }

  function render() {
    const data = loadData();
    const status = document.getElementById("odds-status");
    const out = document.getElementById("odds-results");
    const attemptsEl = document.getElementById("odds-attempts");
    if (!data || !out) return;

    const { mode, tickets, drawings } = readInputs();
    if (tickets == null || drawings == null) {
      if (status) status.textContent = "Enter whole numbers from 1 to 1000 for tickets and drawings.";
      out.innerHTML = '<p class="odds-error">Adjust the inputs to see results.</p>';
      if (attemptsEl) attemptsEl.textContent = "--";
      return;
    }

    const attempts = tickets * drawings;
    if (attemptsEl) {
      attemptsEl.textContent =
        attempts.toLocaleString("en-US") +
        " total attempts (tickets x drawings)";
    }
    if (status) status.textContent = "Updated from your inputs.";

    const games = [];
    if (mode === "compare") {
      games.push(exploreOne(data.megamillions, tickets, drawings));
      games.push(exploreOne(data.powerball, tickets, drawings));
    } else if (mode === "powerball") {
      games.push(exploreOne(data.powerball, tickets, drawings));
    } else {
      games.push(exploreOne(data.megamillions, tickets, drawings));
    }

    out.innerHTML = games.map(gameCardHtml).join("");
  }

  function init() {
    const root = document.getElementById("odds-explorer");
    if (!root) return;

    document.querySelectorAll(".odds-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setPressed(".odds-mode-btn", btn);
        render();
      });
    });
    document.querySelectorAll(".odds-tickets-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setPressed(".odds-tickets-btn", btn);
        toggleCustomVisibility();
        if (btn.getAttribute("data-value") === "custom") {
          const input = document.getElementById("odds-tickets-custom");
          if (input) input.focus();
        }
        render();
      });
    });
    document.querySelectorAll(".odds-drawings-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setPressed(".odds-drawings-btn", btn);
        toggleCustomVisibility();
        if (btn.getAttribute("data-value") === "custom") {
          const input = document.getElementById("odds-drawings-custom");
          if (input) input.focus();
        }
        render();
      });
    });

    ["odds-tickets-custom", "odds-drawings-custom"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    toggleCustomVisibility();
    render();
  }

  APP.probabilityAtLeastOne = probabilityAtLeastOne;
  APP.initOddsExplorer = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.LOTTO);
