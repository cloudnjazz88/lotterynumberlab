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
  function formatUsdSigned(n, opts) {
    opts = opts || {};
    if (n == null || !Number.isFinite(n)) return "—";
    if (n > 0 && opts.forcePlus) return "+" + formatUsd(n);
    return formatUsd(n);
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
      gameId: input.gameId,
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

function formatIsoDateShort(iso) {
    if (!iso || typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso || "");
    const parts = iso.split("-").map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatMatchTierLabel(whiteMatches, bonusMatch, specialName) {
    const w = Number(whiteMatches) || 0;
    const bonus = bonusMatch ? " + " + (specialName || "bonus") : "";
    return w + " white" + bonus;
  }

  function formatReturnPerDollar(rate) {
    if (rate == null || !Number.isFinite(rate) || rate < 0) return null;
    const cents = Math.round(rate * 100);
    if (cents < 100) return cents + "\u00a2";
    return formatUsd(cents / 100);
  }

  function buildResultsPresentation(result) {
    if (!result || !result.ok || result.empty) {
      return { ok: false, empty: Boolean(result && result.empty), message: result && result.message };
    }
    const spent = result.hypotheticalSpent;
    const prizes = result.estimatedBasePrizes;
    const net = result.net;
    const hasJackpot = (result.jackpotTierCount || 0) > 0;

    let outcome;
    let conclusionEyebrow = null;
    let conclusionHeadline;
    let conclusionLabel;
    let conclusionAmount;
    let narrative;
    let narrativeSecondary = null;
    let returnSentence = null;

    if (hasJackpot) {
      outcome = "indeterminate";
      conclusionEyebrow = "Jackpot-tier match found";
      conclusionHeadline = "Overall net cannot be determined";
      conclusionLabel = "";
      conclusionAmount = "Jackpot value not estimated";
      narrative =
        "This run includes a jackpot-tier match. Because the historical jackpot amount is not estimated, total prizes and overall gain or loss cannot be calculated.";
      narrativeSecondary =
        "Excluding the jackpot value, known base prizes total " +
        formatUsd(prizes) +
        " against " +
        formatUsd(spent) +
        " in ticket cost.";
      returnSentence = null;
    } else {
      outcome = "break-even";
      if (net < 0) outcome = "loss";
      else if (net > 0) outcome = "gain";

      if (outcome === "loss") {
        conclusionHeadline = "You would have lost an estimated " + formatUsd(Math.abs(net));
        conclusionLabel = "Estimated loss";
        conclusionAmount = formatUsd(net);
        narrative =
          "You would have spent " +
          formatUsd(spent) +
          " and received an estimated " +
          formatUsd(prizes) +
          " in base prizes, for a net loss of " +
          formatUsd(Math.abs(net)) +
          ".";
      } else if (outcome === "gain") {
        conclusionHeadline = "You would have gained an estimated " + formatUsd(net);
        conclusionLabel = "Estimated gain";
        conclusionAmount = "+" + formatUsd(net);
        narrative =
          "You would have spent " +
          formatUsd(spent) +
          " and received an estimated " +
          formatUsd(prizes) +
          " in base prizes, for a net gain of " +
          formatUsd(net) +
          ".";
      } else {
        conclusionHeadline = "Estimated break-even";
        conclusionLabel = "Estimated break-even";
        conclusionAmount = "$0";
        narrative =
          "You would have spent " +
          formatUsd(spent) +
          " and received an estimated " +
          formatUsd(prizes) +
          " in base prizes, for a break-even net of $0.";
      }

      const retBit = formatReturnPerDollar(result.returnRate);
      returnSentence = retBit
        ? "That is about " + retBit + " returned for every $1 spent."
        : null;
    }

    const tickets = Number(result.ticketsPerDrawing) || 1;
    const drawings = Number(result.drawingsAnalyzed) || 0;
    const specialName = result.specialName || "bonus";
    const prizeRows = [];
    let subtotalSum = 0;
    (result.distribution || []).forEach(function (row) {
      if (row.key === "no-match") {
        prizeRows.push({
          key: "no-prize",
          kind: "no-prize",
          title: "No prize",
          matchLabel: null,
          countLabel: row.count.toLocaleString("en-US") + " drawing" + (row.count === 1 ? "" : "s"),
          totalLabel: null,
          isJackpot: false,
          ratio: drawings > 0 ? row.count / drawings : 0,
        });
        return;
      }
      const parts = String(row.key).split("+");
      const w = Number(parts[0]) || 0;
      const bonusMatch = Number(parts[1]) === 1;
      const matchLabel = formatMatchTierLabel(w, bonusMatch, specialName);
      const prize = lookupBasePrize(result.gameId, w, bonusMatch);
      if (row.isJackpot || prize.isJackpot || prize.value == null) {
        prizeRows.push({
          key: row.key,
          kind: "jackpot",
          title: "Jackpot",
          matchLabel: matchLabel,
          countLabel: row.count + " winning drawing" + (row.count === 1 ? "" : "s"),
          totalLabel: "Amount not estimated",
          isJackpot: true,
          ratio: drawings > 0 ? row.count / drawings : 0,
        });
        return;
      }
      const total = prize.value * tickets * row.count;
      subtotalSum += total;
      prizeRows.push({
        key: row.key,
        kind: "prize",
        title: formatUsd(prize.value) + " base prize",
        matchLabel: matchLabel,
        countLabel: row.count + " winning drawing" + (row.count === 1 ? "" : "s"),
        totalLabel: formatUsd(total) + " total",
        isJackpot: false,
        ratio: drawings > 0 ? row.count / drawings : 0,
      });
    });

    const best = result.bestMatch;
    const bestMatchLabel = best
      ? formatMatchTierLabel(best.whiteMatches, best.bonusMatch, result.specialName)
      : "No prize-tier match";
    const bestMatchDate = best ? formatIsoDateShort(best.d) : "—";

    const winningDrawings = (result.meaningfulMatches || []).map(function (m) {
      return {
        d: m.d,
        dateLabel: formatIsoDateShort(m.d),
        matchLabel: formatMatchTierLabel(m.whiteMatches, m.bonusMatch, result.specialName),
        prizeLabel: m.isJackpot ? "Jackpot (amount not estimated)" : formatUsd(m.estimatedPrize),
        isJackpot: Boolean(m.isJackpot),
      };
    });

    return {
      ok: true,
      outcome: outcome,
      conclusionEyebrow: conclusionEyebrow,
      conclusionHeadline: conclusionHeadline,
      conclusionLabel: conclusionLabel,
      conclusionAmount: conclusionAmount,
      narrative: narrative,
      narrativeSecondary: narrativeSecondary,
      returnSentence: returnSentence,
      cards: {
        totalTicketCost: { label: "Total ticket cost", amount: formatUsd(spent) },
        estimatedPrizes: {
          label: hasJackpot ? "Known estimated prizes" : "Estimated prizes",
          amount: formatUsd(prizes),
          helper: hasJackpot ? "Excludes jackpot value" : "Official base prize amounts only",
        },
        estimatedNet: {
          label: hasJackpot ? "Net excluding jackpot value" : "Estimated net",
          amount: formatUsdSigned(net, { forcePlus: net > 0 }),
        },
      },
      jackpotBanner: null,
      runDetails: {
        drawingsAnalyzed: result.drawingsAnalyzed,
        ticketsPerDrawing: result.ticketsPerDrawing,
        ticketPrice: formatUsd(result.ticketPrice),
        winningDrawings: result.meaningfulTotal || 0,
        noPrizeDrawings: result.noMatchCount || 0,
        bestMatch: bestMatchLabel,
        bestMatchDate: bestMatchDate,
      },
      prizeRows: prizeRows,
      prizeSubtotalSum: subtotalSum,
      winningDrawings: winningDrawings,
      winningTruncated: Boolean(result.meaningfulTruncated),
      winningTotal: result.meaningfulTotal || 0,
      winningLimit: result.meaningfulMatchLimit || MEANINGFUL_LIMIT,
      disclaimer:
        "Historical estimate only. Prize totals use official base prize amounts for the current game matrix. Jackpot cash values, taxes, Megaplier, Power Play, and jurisdiction-specific rules are not included. This is not claim verification.",
      picksLabel:
        (result.whites || [])
          .map(function (n) {
            return String(n).padStart(2, "0");
          })
          .join("-") +
        " + " +
        result.specialAbbr +
        " " +
        String(result.bonus).padStart(2, "0"),
      periodLabel: result.period,
    };
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

    const p = buildResultsPresentation(r);
    const outcomeClass =
      p.outcome === "loss"
        ? "wi-conclusion--loss"
        : p.outcome === "gain"
          ? "wi-conclusion--gain"
          : p.outcome === "indeterminate"
            ? "wi-conclusion--indeterminate"
            : "wi-conclusion--even";

    let prizeHtml = '<ul class="wi-prize-results" role="list">';
    p.prizeRows.forEach(function (row) {
      const barPct = Math.max(0, Math.min(100, Math.round((row.ratio || 0) * 1000) / 10));
      prizeHtml +=
        '<li class="wi-prize-results__row wi-prize-results__row--' +
        escapeHtml(row.kind) +
        '">' +
        '<div class="wi-prize-results__main">' +
        '<span class="wi-prize-results__title">' +
        escapeHtml(row.title) +
        (row.matchLabel
          ? ' <span class="wi-prize-results__match">(' + escapeHtml(row.matchLabel) + ")</span>"
          : "") +
        "</span>" +
        '<span class="wi-prize-results__meta">' +
        '<span class="wi-prize-results__count">' +
        escapeHtml(row.countLabel) +
        "</span>" +
        (row.totalLabel
          ? '<span class="wi-prize-results__total">' + escapeHtml(row.totalLabel) + "</span>"
          : "") +
        "</span>" +
        "</div>" +
        '<div class="wi-prize-results__bar" aria-hidden="true"><span style="width:' +
        barPct +
        '%"></span></div>' +
        "</li>";
    });
    prizeHtml += "</ul>";

    let winsHtml = "";
    if (p.winningDrawings.length) {
      winsHtml =
        '<div class="wi-wins" role="table" aria-label="Winning drawings">' +
        '<div class="wi-wins__head" role="row">' +
        '<span role="columnheader">Date</span>' +
        '<span role="columnheader">Match</span>' +
        '<span role="columnheader">Estimated base prize</span>' +
        "</div>";
      p.winningDrawings.forEach(function (m) {
        winsHtml +=
          '<div class="wi-wins__row" role="row">' +
          '<span role="cell"><time datetime="' +
          m.d +
          '">' +
          escapeHtml(m.dateLabel) +
          "</time></span>" +
          '<span role="cell">' +
          escapeHtml(m.matchLabel) +
          "</span>" +
          '<span role="cell">' +
          escapeHtml(m.prizeLabel) +
          "</span>" +
          "</div>";
      });
      winsHtml += "</div>";
      if (p.winningTruncated) {
        winsHtml += '<p class="wi-matches__note">Showing the first 20 winning drawings</p>';
      }
    } else {
      winsHtml = '<p class="wi-wins__empty">No winning drawings in this range.</p>';
    }

    const rd = p.runDetails;
    out.innerHTML =
      '<div class="wi-summary" data-wi-outcome="' +
      escapeHtml(p.outcome) +
      '">' +
      "<h3>Hypothetical results</h3>" +
      '<p class="wi-summary__picks"><strong>Numbers:</strong> ' +
      escapeHtml(p.picksLabel) +
      "</p>" +
      "<p><strong>Range:</strong> " +
      escapeHtml(p.periodLabel) +
      "</p>" +
      '<div class="wi-conclusion ' +
      outcomeClass +
      '" role="status" aria-label="' +
      escapeHtml(p.outcome) +
      '">' +
      (p.conclusionEyebrow
        ? '<p class="wi-conclusion__eyebrow">' + escapeHtml(p.conclusionEyebrow) + "</p>"
        : "") +
      '<p class="wi-conclusion__headline">' +
      escapeHtml(p.conclusionHeadline) +
      "</p>" +
      '<div class="wi-conclusion__amount-wrap">' +
      (p.conclusionLabel
        ? '<span class="wi-conclusion__label">' + escapeHtml(p.conclusionLabel) + "</span>"
        : "") +
      '<span class="wi-conclusion__amount">' +
      escapeHtml(p.conclusionAmount) +
      "</span>" +
      "</div>" +
      '<span class="wi-conclusion__state visually-hidden">' +
      escapeHtml(p.outcome) +
      "</span>" +
      "</div>" +
      (p.jackpotBanner
        ? '<p class="wi-jackpot-note" role="note">' + escapeHtml(p.jackpotBanner) + "</p>"
        : "") +
      '<dl class="wi-summary-cards">' +
      '<div class="wi-summary-card">' +
      "<dt>" +
      escapeHtml(p.cards.totalTicketCost.label) +
      "</dt><dd>" +
      escapeHtml(p.cards.totalTicketCost.amount) +
      "</dd></div>" +
      '<div class="wi-summary-card">' +
      "<dt>" +
      escapeHtml(p.cards.estimatedPrizes.label) +
      "</dt><dd>" +
      escapeHtml(p.cards.estimatedPrizes.amount) +
      '</dd><p class="wi-summary-card__helper">' +
      escapeHtml(p.cards.estimatedPrizes.helper) +
      "</p></div>" +
      '<div class="wi-summary-card wi-summary-card--net">' +
      "<dt>" +
      escapeHtml(p.cards.estimatedNet.label) +
      "</dt><dd>" +
      escapeHtml(p.cards.estimatedNet.amount) +
      "</dd></div>" +
      "</dl>" +
      '<div class="wi-interpret">' +
      "<p>" +
      escapeHtml(p.narrative) +
      "</p>" +
      (p.narrativeSecondary ? "<p>" + escapeHtml(p.narrativeSecondary) + "</p>" : "") +
      (p.returnSentence ? "<p>" + escapeHtml(p.returnSentence) + "</p>" : "") +
      "</div>" +
      '<section class="wi-section wi-section--details" aria-labelledby="wi-run-details">' +
      '<h4 id="wi-run-details">Run details</h4>' +
      '<dl class="wi-details">' +
      "<div><dt>Drawings analyzed</dt><dd>" +
      Number(rd.drawingsAnalyzed).toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>Tickets per drawing</dt><dd>" +
      rd.ticketsPerDrawing +
      "</dd></div>" +
      "<div><dt>Ticket price</dt><dd>" +
      escapeHtml(rd.ticketPrice) +
      "</dd></div>" +
      "<div><dt>Winning drawings</dt><dd>" +
      Number(rd.winningDrawings).toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>No-prize drawings</dt><dd>" +
      Number(rd.noPrizeDrawings).toLocaleString("en-US") +
      "</dd></div>" +
      "<div><dt>Best match</dt><dd>" +
      escapeHtml(rd.bestMatch) +
      "</dd></div>" +
      "<div><dt>Best match date</dt><dd>" +
      escapeHtml(rd.bestMatchDate) +
      "</dd></div>" +
      "</dl>" +
      "</section>" +
      '<section class="wi-section wi-section--prizes" aria-labelledby="wi-prize-results">' +
      '<h4 id="wi-prize-results">Prize results</h4>' +
      prizeHtml +
      "</section>" +
      '<section class="wi-section wi-section--wins" aria-labelledby="wi-winning-drawings">' +
      '<h4 id="wi-winning-drawings">Winning drawings</h4>' +
      winsHtml +
      "</section>" +
      '<p class="wi-disclaimer" role="note">' +
      escapeHtml(p.disclaimer) +
      "</p>" +
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
