/* Lottery What If Calculator — client-side only. Hypothetical historical replay. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  const GAME_RANGES = {
    megamillions: {
      id: "megamillions",
      name: "Mega Millions",
      mainMax: 70,
      specialMax: 24,
      pick: 5,
      specialName: "Mega Ball",
      specialAbbr: "MB",
      matrixLabel: "5 of 70 + 1 of 24",
      matrixSinceLabel: "October 31, 2017",
    },
    powerball: {
      id: "powerball",
      name: "Powerball",
      mainMax: 69,
      specialMax: 26,
      pick: 5,
      specialName: "Powerball",
      specialAbbr: "PB",
      matrixLabel: "5 of 69 + 1 of 26",
      matrixSinceLabel: "October 7, 2015",
    },
  };

  const TICKET_PRICE_USD = { megamillions: 5, powerball: 2 };
  const MAX_TICKETS = 100;
  const MEANINGFUL_LIMIT = 20;

  const MM_PRIZES = {
    "5+1": { label: "Jackpot", value: null },
    "5+0": { label: "$1,000,000", value: 1000000 },
    "4+1": { label: "$10,000", value: 10000 },
    "4+0": { label: "$500", value: 500 },
    "3+1": { label: "$200", value: 200 },
    "3+0": { label: "$10", value: 10 },
    "2+1": { label: "$10", value: 10 },
    "1+1": { label: "$7", value: 7 },
    "0+1": { label: "$5", value: 5 },
  };
  const PB_PRIZES = {
    "5+1": { label: "Jackpot", value: null },
    "5+0": { label: "$1,000,000", value: 1000000 },
    "4+1": { label: "$50,000", value: 50000 },
    "4+0": { label: "$100", value: 100 },
    "3+1": { label: "$100", value: 100 },
    "3+0": { label: "$7", value: 7 },
    "2+1": { label: "$7", value: 7 },
    "1+1": { label: "$4", value: 4 },
    "0+1": { label: "$4", value: 4 },
  };

  let state = {
    gameId: "megamillions",
    whites: [],
    bonus: null,
    period: "last1y",
    ticketsPerDrawing: 1,
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function validateTicket(gameId, whites, bonus) {
    const game = GAME_RANGES[gameId];
    if (!game) return { ok: false, error: "Choose Mega Millions or Powerball." };
    const nums = (Array.isArray(whites) ? whites : []).map(Number);
    if (nums.length !== game.pick) {
      return { ok: false, error: "Pick exactly " + game.pick + " white balls." };
    }
    if (!nums.every(function (n) { return Number.isInteger(n); })) {
      return { ok: false, error: "White balls must be whole numbers." };
    }
    if (nums.some(function (n) { return n < 1 || n > game.mainMax; })) {
      return { ok: false, error: "White balls must be between 1 and " + game.mainMax + "." };
    }
    if (new Set(nums).size !== nums.length) {
      return { ok: false, error: "White balls must be unique." };
    }
    const s = Number(bonus);
    if (!Number.isInteger(s) || s < 1 || s > game.specialMax) {
      return {
        ok: false,
        error: game.specialName + " must be an integer from 1 to " + game.specialMax + ".",
      };
    }
    return { ok: true, whites: nums.slice().sort(function (a, b) { return a - b; }), bonus: s, game: game };
  }

  function matchTicket(ticketWhites, ticketBonus, drawWhites, drawBonus) {
    const ticketSet = new Set((ticketWhites || []).map(Number));
    const drawMain = (drawWhites || []).map(Number);
    let whiteMatches = 0;
    for (let i = 0; i < drawMain.length; i++) {
      if (ticketSet.has(drawMain[i])) whiteMatches += 1;
    }
    return {
      whiteMatches: whiteMatches,
      bonusMatch: Number(ticketBonus) === Number(drawBonus),
    };
  }

  function tierKey(w, b) {
    return (Number(w) || 0) + "+" + (b ? 1 : 0);
  }

  function matchStrength(w, b) {
    return (Number(w) || 0) * 2 + (b ? 1 : 0);
  }

  function prizesFor(gameId) {
    return gameId === "megamillions" ? MM_PRIZES : PB_PRIZES;
  }

  function lookupBasePrize(gameId, w, b) {
    const prizes = prizesFor(gameId);
    const key = tierKey(w, b);
    const row = prizes[key];
    if (!row) return { key: key, isWinning: false, isJackpot: false, label: null, value: null };
    return {
      key: key,
      isWinning: true,
      isJackpot: row.value == null,
      label: row.label,
      value: row.value,
    };
  }

  function drawingDateBounds(draws) {
    const list = Array.isArray(draws) ? draws : [];
    if (!list.length) return { min: null, max: null };
    let min = list[0].d;
    let max = list[0].d;
    for (let i = 0; i < list.length; i++) {
      const d = list[i] && list[i].d;
      if (typeof d !== "string") continue;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { min: min, max: max };
  }

  function addIsoDays(isoDate, days) {
    const parts = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + days);
    return (
      dt.getUTCFullYear() +
      "-" +
      String(dt.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(dt.getUTCDate()).padStart(2, "0")
    );
  }

  function formatUsd(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    return (
      sign +
      "$" +
      abs.toLocaleString("en-US", {
        minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function loadDraws(gameId) {
    const bundled = APP.data && APP.data.loadBundled ? APP.data.loadBundled() : null;
    if (bundled && bundled.games && bundled.games[gameId]) {
      return bundled.games[gameId].draws || [];
    }
    const snap = window.LOTTO_SNAPSHOT;
    if (snap && snap.games && snap.games[gameId]) {
      return snap.games[gameId].draws || [];
    }
    return [];
  }

  function resolvePeriod(draws, period, customStart, customEnd) {
    const bounds = drawingDateBounds(draws);
    if (!bounds.min || !bounds.max) {
      return { ok: false, error: "No drawings available for this game." };
    }
    let start = bounds.min;
    let end = bounds.max;
    let label = "All current-matrix history (" + bounds.min + " – " + bounds.max + " ET)";
    if (period === "last1y") {
      start = addIsoDays(bounds.max, -365);
      if (start < bounds.min) start = bounds.min;
      label = "Last 1 year through " + bounds.max + " ET";
    } else if (period === "last5y") {
      start = addIsoDays(bounds.max, -(365 * 5));
      if (start < bounds.min) start = bounds.min;
      label = "Last 5 years through " + bounds.max + " ET";
    } else if (period === "all") {
      /* defaults */
    } else if (period === "custom") {
      const a = (customStart || "").trim();
      const b = (customEnd || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
        return { ok: false, error: "Enter custom start and end dates as Eastern Time drawing dates (YYYY-MM-DD)." };
      }
      if (a > b) return { ok: false, error: "Custom start date must be on or before the end date." };
      if (a > bounds.max || b < bounds.min) {
        return { ok: false, error: "Custom range is outside bundled history (" + bounds.min + " – " + bounds.max + " ET)." };
      }
      if (a > bounds.max) {
        return { ok: false, error: "Start date is after the latest bundled drawing (" + bounds.max + " ET)." };
      }
      if (b > bounds.max) {
        return { ok: false, error: "End date is after the latest bundled drawing (" + bounds.max + " ET). Future drawings are not included." };
      }
      start = a < bounds.min ? bounds.min : a;
      end = b > bounds.max ? bounds.max : b;
      label = "Custom range " + start + " – " + end + " ET";
    } else {
      return { ok: false, error: "Choose a period." };
    }
    return { ok: true, start: start, end: end, label: label, bounds: bounds };
  }

  function analyzeWhatIf(input) {
    const ticket = validateTicket(input.gameId, input.whites, input.bonus);
    if (!ticket.ok) return { ok: false, error: ticket.error };
    const ticketsPerDrawing = Number(input.ticketsPerDrawing);
    if (!Number.isInteger(ticketsPerDrawing) || ticketsPerDrawing < 1 || ticketsPerDrawing > MAX_TICKETS) {
      return { ok: false, error: "Tickets per drawing must be a whole number from 1 to " + MAX_TICKETS + "." };
    }
    const draws = Array.isArray(input.draws) ? input.draws : [];
    const period = resolvePeriod(draws, input.period, input.customStart, input.customEnd);
    if (!period.ok) return { ok: false, error: period.error };
    const drawsInRange = draws.filter(function (d) {
      return d && typeof d.d === "string" && d.d >= period.start && d.d <= period.end;
    });
    const price = TICKET_PRICE_USD[input.gameId];
    const game = ticket.game;
    if (!drawsInRange.length) {
      return {
        ok: true,
        empty: true,
        gameName: game.name,
        specialAbbr: game.specialAbbr,
        whites: ticket.whites,
        bonus: ticket.bonus,
        period: period.label,
        drawingsAnalyzed: 0,
        ticketsPerDrawing: ticketsPerDrawing,
        ticketPrice: price,
        hypotheticalSpent: 0,
        estimatedBasePrizes: 0,
        net: 0,
        returnRate: null,
        bestMatch: null,
        noMatchCount: 0,
        jackpotTierCount: 0,
        distribution: [],
        meaningfulMatches: [],
        meaningfulTruncated: false,
        meaningfulTotal: 0,
        message:
          "No drawings fall in this date range within the bundled current-matrix history. Try a wider period or different custom dates.",
      };
    }

    const tierCounts = Object.create(null);
    let noMatchCount = 0;
    let jackpotTierCount = 0;
    let estimatedBasePrizes = 0;
    const allMatches = [];
    const prizes = prizesFor(input.gameId);

    for (let i = 0; i < drawsInRange.length; i++) {
      const draw = drawsInRange[i];
      const m = matchTicket(ticket.whites, ticket.bonus, draw.n, draw.s);
      const key = tierKey(m.whiteMatches, m.bonusMatch);
      tierCounts[key] = (tierCounts[key] || 0) + 1;
      const prize = lookupBasePrize(input.gameId, m.whiteMatches, m.bonusMatch);
      if (!prize.isWinning) {
        noMatchCount += 1;
      } else if (prize.isJackpot) {
        jackpotTierCount += 1;
      } else if (prize.value != null) {
        estimatedBasePrizes += prize.value * ticketsPerDrawing;
      }
      if (prize.isWinning) {
        allMatches.push({
          d: draw.d,
          n: (draw.n || []).slice(),
          s: draw.s,
          whiteMatches: m.whiteMatches,
          bonusMatch: m.bonusMatch,
          isJackpot: prize.isJackpot,
          prizeLabel: prize.isJackpot
            ? "Jackpot-tier match — historical jackpot payout not estimated"
            : prize.label,
          estimatedPrize: prize.isJackpot || prize.value == null ? null : prize.value * ticketsPerDrawing,
        });
      }
    }

    allMatches.sort(function (a, b) {
      const sa = matchStrength(a.whiteMatches, a.bonusMatch);
      const sb = matchStrength(b.whiteMatches, b.bonusMatch);
      if (sb !== sa) return sb - sa;
      if (b.whiteMatches !== a.whiteMatches) return b.whiteMatches - a.whiteMatches;
      if (a.bonusMatch !== b.bonusMatch) return a.bonusMatch ? -1 : 1;
      if (a.d < b.d) return 1;
      if (a.d > b.d) return -1;
      return 0;
    });

    const distribution = [];
    Object.keys(prizes).forEach(function (key) {
      const count = tierCounts[key] || 0;
      if (!count) return;
      distribution.push({
        key: key,
        count: count,
        label: prizes[key].label,
        isJackpot: prizes[key].value == null,
      });
    });
    if (noMatchCount > 0) {
      distribution.push({ key: "no-match", count: noMatchCount, label: "No prize-tier match", isJackpot: false });
    }

    const hypotheticalSpent = price * ticketsPerDrawing * drawsInRange.length;
    return {
      ok: true,
      empty: false,
      gameName: game.name,
      specialName: game.specialName,
      specialAbbr: game.specialAbbr,
      matrixLabel: game.matrixLabel,
      whites: ticket.whites,
      bonus: ticket.bonus,
      period: period.label,
      drawingsAnalyzed: drawsInRange.length,
      ticketsPerDrawing: ticketsPerDrawing,
      ticketPrice: price,
      hypotheticalSpent: hypotheticalSpent,
      estimatedBasePrizes: estimatedBasePrizes,
      jackpotTierCount: jackpotTierCount,
      jackpotNote:
        jackpotTierCount > 0
          ? "Jackpot-tier match — historical jackpot payout not estimated"
          : null,
      net: estimatedBasePrizes - hypotheticalSpent,
      returnRate: hypotheticalSpent > 0 ? estimatedBasePrizes / hypotheticalSpent : null,
      bestMatch: allMatches[0] || null,
      noMatchCount: noMatchCount,
      distribution: distribution,
      meaningfulMatches: allMatches.slice(0, MEANINGFUL_LIMIT),
      meaningfulTruncated: allMatches.length > MEANINGFUL_LIMIT,
      meaningfulTotal: allMatches.length,
    };
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, isError) {
    const el = $("wi-status");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
    el.classList.toggle("wi-status--error", Boolean(isError));
  }

  function renderGrids() {
    const game = GAME_RANGES[state.gameId];
    const white = $("wi-white-grid");
    const bonus = $("wi-bonus-grid");
    const whiteLegend = $("wi-white-legend");
    const bonusLegend = $("wi-bonus-legend");
    if (!white || !bonus || !game) return;
    whiteLegend.textContent = "White balls (pick 5 from 1–" + game.mainMax + ")";
    bonusLegend.textContent = game.specialName + " (pick 1 from 1–" + game.specialMax + ")";
    white.innerHTML = "";
    bonus.innerHTML = "";
    for (let n = 1; n <= game.mainMax; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tm-pick" + (state.whites.indexOf(n) >= 0 ? " is-selected" : "");
      btn.textContent = pad2(n);
      btn.setAttribute("aria-pressed", state.whites.indexOf(n) >= 0 ? "true" : "false");
      btn.addEventListener("click", function () {
        toggleWhite(n);
      });
      white.appendChild(btn);
    }
    bonus.className = "tm-grid tm-grid--bonus " + (state.gameId === "megamillions" ? "tm-grid--mm" : "tm-grid--pb");
    for (let n = 1; n <= game.specialMax; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tm-pick tm-pick--bonus" + (state.bonus === n ? " is-selected" : "");
      btn.textContent = pad2(n);
      btn.setAttribute("aria-pressed", state.bonus === n ? "true" : "false");
      btn.addEventListener("click", function () {
        toggleBonus(n);
      });
      bonus.appendChild(btn);
    }
    updateSelection();
  }

  function toggleWhite(n) {
    const i = state.whites.indexOf(n);
    if (i >= 0) state.whites.splice(i, 1);
    else if (state.whites.length < 5) state.whites.push(n);
    state.whites.sort(function (a, b) { return a - b; });
    renderGrids();
  }

  function toggleBonus(n) {
    state.bonus = state.bonus === n ? null : n;
    renderGrids();
  }

  function updateSelection() {
    const el = $("wi-selection");
    const game = GAME_RANGES[state.gameId];
    if (!el || !game) return;
    if (state.whites.length === 5 && state.bonus != null) {
      el.textContent =
        state.whites.map(pad2).join("-") + " + " + game.specialAbbr + " " + pad2(state.bonus);
    } else {
      el.textContent =
        "Select 5 white balls and 1 " + game.specialName + " (" + state.whites.length + "/5 whites)";
    }
  }

  function syncCustomVisibility() {
    const row = $("wi-custom-row");
    if (row) row.hidden = state.period !== "custom";
  }

  function clearResults() {
    const out = $("wi-results");
    if (out) {
      out.hidden = true;
      out.innerHTML = "";
    }
  }

  function runAnalyze(ev) {
    if (ev) ev.preventDefault();
    setStatus("");
    const ticketsEl = $("wi-tickets");
    const tickets = ticketsEl ? Number(ticketsEl.value) : 1;
    const draws = loadDraws(state.gameId);
    if (!draws.length) {
      setStatus("Drawing history failed to load in this browser.", true);
      return;
    }
    const result = analyzeWhatIf({
      gameId: state.gameId,
      whites: state.whites,
      bonus: state.bonus,
      draws: draws,
      period: state.period,
      customStart: $("wi-start") ? $("wi-start").value : "",
      customEnd: $("wi-end") ? $("wi-end").value : "",
      ticketsPerDrawing: tickets,
    });
    if (!result.ok) {
      setStatus(result.error, true);
      clearResults();
      return;
    }
    renderResults(result);
  }

  function renderResults(r) {
    const out = $("wi-results");
    if (!out) return;
    out.hidden = false;
    if (r.empty) {
      out.innerHTML =
        '<div class="wi-empty" role="status"><h3>No drawings in range</h3><p>' +
        escapeHtml(r.message) +
        "</p></div>";
      return;
    }

    const returnPct =
      r.returnRate == null || !Number.isFinite(r.returnRate)
        ? "—"
        : (r.returnRate * 100).toFixed(2) + "%";
    const best = r.bestMatch
      ? r.bestMatch.whiteMatches +
        " white" +
        (r.bestMatch.bonusMatch ? " + " + r.specialAbbr : "") +
        " on " +
        r.bestMatch.d
      : "No prize-tier matches in this range";

    let distHtml = '<ul class="wi-dist">';
    (r.distribution || []).forEach(function (row) {
      distHtml +=
        "<li><span>" +
        escapeHtml(row.label) +
        '</span> <strong>' +
        row.count +
        "</strong></li>";
    });
    distHtml += "</ul>";

    let matchesHtml = "";
    if (r.meaningfulMatches && r.meaningfulMatches.length) {
      matchesHtml = '<ol class="wi-matches">';
      r.meaningfulMatches.forEach(function (m) {
        const prizeBit = m.isJackpot
          ? escapeHtml(m.prizeLabel)
          : "Est. base " + formatUsd(m.estimatedPrize);
        matchesHtml +=
          "<li><time datetime=\"" +
          m.d +
          "\">" +
          m.d +
          "</time> · " +
          m.whiteMatches +
          " white" +
          (m.bonusMatch ? " + " + r.specialAbbr : "") +
          " · " +
          prizeBit +
          "</li>";
      });
      matchesHtml += "</ol>";
      if (r.meaningfulTruncated) {
        matchesHtml +=
          '<p class="wi-matches__note">Showing the strongest ' +
          MEANINGFUL_LIMIT +
          " of " +
          r.meaningfulTotal +
          " prize-tier matches (not every drawing).</p>";
      }
    } else {
      matchesHtml = "<p>No prize-tier matches in this range.</p>";
    }

    out.innerHTML =
      '<div class="wi-summary">' +
      "<h3>Hypothetical results</h3>" +
      '<p class="wi-summary__picks"><strong>Numbers:</strong> ' +
      r.whites.map(pad2).join("-") +
      " + " +
      r.specialAbbr +
      " " +
      pad2(r.bonus) +
      "</p>" +
      "<p><strong>Range:</strong> " +
      escapeHtml(r.period) +
      "</p>" +
      '<dl class="wi-glance">' +
      "<div><dt>Drawings analyzed</dt><dd>" +
      r.drawingsAnalyzed.toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>Tickets per drawing</dt><dd>" +
      r.ticketsPerDrawing +
      "</dd></div>" +
      "<div><dt>Ticket price</dt><dd>" +
      formatUsd(r.ticketPrice) +
      "</dd></div>" +
      "<div><dt>Hypothetical spent</dt><dd>" +
      formatUsd(r.hypotheticalSpent) +
      "</dd></div>" +
      "<div><dt>Estimated base prizes</dt><dd>" +
      formatUsd(r.estimatedBasePrizes) +
      "</dd></div>" +
      "<div><dt>Net (est. prizes − spent)</dt><dd>" +
      formatUsd(r.net) +
      "</dd></div>" +
      "<div><dt>Return rate (est.)</dt><dd>" +
      returnPct +
      "</dd></div>" +
      "<div><dt>Best match</dt><dd>" +
      escapeHtml(best) +
      "</dd></div>" +
      "<div><dt>No-match drawings</dt><dd>" +
      r.noMatchCount.toLocaleString("en-US") +
      "</dd></div>" +
      "</dl>" +
      (r.jackpotNote
        ? '<p class="wi-jackpot-note" role="note">' + escapeHtml(r.jackpotNote) + "</p>"
        : "") +
      "<h4>Tier distribution</h4>" +
      distHtml +
      "<h4>Meaningful matches</h4>" +
      matchesHtml +
      '<p class="wi-disclaimer">Estimated / hypothetical only. Official base prizes; no tax, Megaplier, or Power Play. Not claim verification.</p>' +
      "</div>";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function switchGame(gameId) {
    if (!GAME_RANGES[gameId]) return;
    state.gameId = gameId;
    state.whites = [];
    state.bonus = null;
    document.querySelectorAll(".wi-game-btn").forEach(function (btn) {
      const on = btn.getAttribute("data-game") === gameId;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const root = $("wi-tool");
    if (root) root.setAttribute("data-wi-game", gameId);
    clearResults();
    setStatus("");
    renderGrids();
    setDateBounds();
  }

  function setDateBounds() {
    const draws = loadDraws(state.gameId);
    const bounds = drawingDateBounds(draws);
    const start = $("wi-start");
    const end = $("wi-end");
    if (start && bounds.min) {
      start.min = bounds.min;
      start.max = bounds.max;
    }
    if (end && bounds.max) {
      end.min = bounds.min;
      end.max = bounds.max;
    }
  }

  function init() {
    const form = $("wi-form");
    if (!form) return;
    const needed = document.querySelector(".wi-js-needed");
    if (needed) needed.hidden = true;

    document.querySelectorAll(".wi-game-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchGame(btn.getAttribute("data-game"));
      });
    });

    document.querySelectorAll('input[name="wi-period"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) {
          state.period = input.value;
          syncCustomVisibility();
        }
      });
    });

    form.addEventListener("submit", runAnalyze);
    const clearBtn = $("wi-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.whites = [];
        state.bonus = null;
        clearResults();
        setStatus("");
        renderGrids();
      });
    }

    renderGrids();
    syncCustomVisibility();
    setDateBounds();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  APP.whatIf = {
    analyzeWhatIf: analyzeWhatIf,
    validateTicket: validateTicket,
    matchTicket: matchTicket,
  };
})(window.LOTTO);
