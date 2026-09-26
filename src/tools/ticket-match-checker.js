/* Lottery Ticket Match & History Checker  --  client-side only. */
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
      prizeChartUrl: "https://www.megamillions.com/How-to-Play.aspx",
      prizeChartLabel: "Mega Millions prize tiers (official)",
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
      prizeChartUrl: "https://www.powerball.com/powerball-prize-chart",
      prizeChartLabel: "Powerball prize chart (official)",
    },
  };

  const RECENT_DRAW_LIMIT = 20;
  const MM_MEGA_BALL_HISTORY_NOTE =
    "Historical search uses post-2017 white-ball matrix history; Mega Ball pool changed 25→24 in 2025; current input range 1–24; past Mega Ball 25 draws can exist and are not data errors.";

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
    if (!nums.every((n) => Number.isInteger(n))) {
      return { ok: false, error: "White balls must be whole numbers." };
    }
    if (nums.some((n) => n < 1 || n > game.mainMax)) {
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
    return {
      ok: true,
      whites: nums.slice().sort((a, b) => a - b),
      bonus: s,
      game,
    };
  }

  function matchTicket(ticketWhites, ticketBonus, drawWhites, drawBonus) {
    const ticketSet = new Set((ticketWhites || []).map(Number));
    let whiteMatches = 0;
    for (const n of drawWhites || []) {
      if (ticketSet.has(Number(n))) whiteMatches += 1;
    }
    return {
      whiteMatches,
      bonusMatch: Number(ticketBonus) === Number(drawBonus),
    };
  }

  function describeMatch(whiteMatches, bonusMatch, specialName) {
    const w = Number(whiteMatches) || 0;
    const b = Boolean(bonusMatch);
    const sn = specialName || "bonus ball";
    if (w === 0 && !b) return "No numbers matched";
    if (w === 0 && b) return "0 white balls + " + sn + " matched";
    if (w > 0 && !b) return w === 1 ? "1 white ball matched" : w + " white balls matched";
    if (w === 1) return "1 white + " + sn + " matched";
    return w + " white + " + sn + " matched";
  }

  function softTierHint(whiteMatches, bonusMatch, gameId) {
    const w = Number(whiteMatches) || 0;
    const b = Boolean(bonusMatch);
    if (w === 0 && !b) return null;
    const game = GAME_RANGES[gameId];
    const name = game ? game.name : "this game";
    if (w === 5 && b) {
      return (
        "Pattern matches the top published " +
        name +
        " jackpot tier. Confirm any claim with your state lottery."
      );
    }
    if (w === 5 && !b) {
      return (
        "Pattern matches a high published " +
        name +
        " tier (5 white balls). Confirm any claim with your state lottery."
      );
    }
    if (w >= 3 || (w >= 1 && b) || (w === 0 && b)) {
      return (
        "This pattern may correspond to a published prize tier for " +
        name +
        ". Verify amounts and eligibility with your state lottery  --  this site does not list payouts."
      );
    }
    return null;
  }

  function matchKey(m) {
    return m.whiteMatches + "-" + (m.bonusMatch ? 1 : 0);
  }

  function rankHistory(ticketWhites, ticketBonus, draws, options) {
    const limit = options && options.limit != null ? Number(options.limit) : 10;
    const list = Array.isArray(draws) ? draws : [];
    if (!list.length) return { ok: false, error: "No drawings available for this game." };
    const results = list.map((draw) => {
      const m = matchTicket(ticketWhites, ticketBonus, draw.n, draw.s);
      return {
        d: draw.d,
        n: (draw.n || []).slice(),
        s: draw.s,
        whiteMatches: m.whiteMatches,
        bonusMatch: m.bonusMatch,
      };
    });
    results.sort((a, b) => {
      if (b.whiteMatches !== a.whiteMatches) return b.whiteMatches - a.whiteMatches;
      if (a.bonusMatch !== b.bonusMatch) return a.bonusMatch ? -1 : 1;
      if (a.d < b.d) return 1;
      if (a.d > b.d) return -1;
      return 0;
    });
    const best = results[0];
    const bestKey = matchKey(best);
    const countAtBest = results.filter((r) => matchKey(r) === bestKey).length;
    const dates = list.map((d) => d.d).slice().sort();
    return {
      ok: true,
      results,
      best,
      countAtBest,
      top: results.slice(0, Math.max(0, limit)),
      drawCount: list.length,
      firstDraw: dates[0],
      latestDraw: dates[dates.length - 1],
      maxWhiteMatches: best.whiteMatches,
    };
  }

  function buildDrawDateMap(draws) {
    const map = new Map();
    for (const draw of Array.isArray(draws) ? draws : []) {
      if (draw && typeof draw.d === "string") map.set(draw.d, draw);
    }
    return map;
  }

  function getRecentDraws(draws, limit) {
    const list = Array.isArray(draws) ? draws : [];
    const n = Math.max(0, Number(limit != null ? limit : RECENT_DRAW_LIMIT) || 0);
    return list.slice(0, n);
  }

  function drawingDateBounds(draws) {
    const list = Array.isArray(draws) ? draws : [];
    if (!list.length) return { min: null, max: null };
    let min = list[0].d;
    let max = list[0].d;
    for (const draw of list) {
      if (!draw || typeof draw.d !== "string") continue;
      if (draw.d < min) min = draw.d;
      if (draw.d > max) max = draw.d;
    }
    return { min, max };
  }

  function lookupDrawByDate(dateMap, isoDate) {
    if (!dateMap || typeof isoDate !== "string" || !isoDate) return null;
    return dateMap.get(isoDate) || null;
  }

  function findNearestDrawDates(draws, isoDate) {
    const dates = (Array.isArray(draws) ? draws : [])
      .map((d) => (d && d.d) || null)
      .filter(Boolean)
      .slice()
      .sort();
    let previous = null;
    let next = null;
    for (const d of dates) {
      if (d < isoDate) previous = d;
      else if (d > isoDate) {
        next = d;
        break;
      }
    }
    return { previous, next };
  }

  function resolveActiveDraw(opts) {
    const source = opts.source || "recent";
    const list = Array.isArray(opts.draws) ? opts.draws : [];
    const dateMap = opts.dateMap;
    const bounds = drawingDateBounds(list);
    const name = opts.gameName || "this game";

    if (source === "date") {
      const dateValue = opts.dateValue;
      if (!dateValue) {
        return {
          ok: false,
          error: "Enter an Eastern Time drawing date, or use Recent drawing.",
          draw: null,
          source: "date",
          suggestions: null,
        };
      }
      if (bounds.min && dateValue < bounds.min) {
        return {
          ok: false,
          error: "That date is before the earliest bundled " + name + " drawing (" + bounds.min + ").",
          draw: null,
          source: "date",
          suggestions: null,
        };
      }
      if (bounds.max && dateValue > bounds.max) {
        return {
          ok: false,
          error: "That date is after the latest bundled " + name + " drawing (" + bounds.max + ").",
          draw: null,
          source: "date",
          suggestions: null,
        };
      }
      const hit = lookupDrawByDate(dateMap, dateValue);
      if (!hit) {
        return {
          ok: false,
          error: "No " + name + " drawing was held on this date.",
          draw: null,
          source: "date",
          suggestions: findNearestDrawDates(list, dateValue),
        };
      }
      return { ok: true, draw: hit, source: "date", error: null, suggestions: null };
    }

    const fromRecent = opts.recentValue ? lookupDrawByDate(dateMap, opts.recentValue) : null;
    const draw = fromRecent || list[0] || null;
    if (!draw) {
      return {
        ok: false,
        error: "No drawings available for this game.",
        draw: null,
        source: "recent",
        suggestions: null,
      };
    }
    return { ok: true, draw: draw, source: "recent", error: null, suggestions: null };
  }

  function dateLong(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const drawMaps = Object.create(null);

  function getDrawMap(gameId) {
    if (!drawMaps[gameId]) {
      drawMaps[gameId] = buildDrawDateMap(loadDraws(gameId));
    }
    return drawMaps[gameId];
  }

  const state = {
    gameId: "megamillions",
    whites: new Set(),
    bonus: null,
    activeSource: "recent",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function game() {
    return GAME_RANGES[state.gameId];
  }

  function setStatus(msg, isError) {
    const el = $("tm-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-error", Boolean(isError));
  }

  function setDateMsg(msg, isError) {
    const el = $("tm-date-msg");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("is-error");
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-error", Boolean(isError));
  }

  function formatDrawLabel(draw, isLatest) {
    // Keep option text short so the select does not force horizontal overflow.
    // Full numbers appear in the Selected drawing line.
    return dateLong(draw.d) + " ET" + (isLatest ? " (latest)" : "");
  }

  function currentResolution() {
    const draws = loadDraws(state.gameId);
    const sel = $("tm-draw-select");
    const dateInput = $("tm-draw-date");
    return resolveActiveDraw({
      source: state.activeSource,
      recentValue: sel ? sel.value : "",
      dateValue: dateInput ? dateInput.value : "",
      dateMap: getDrawMap(state.gameId),
      draws: draws,
      gameName: game().name,
    });
  }

  function updateActiveDrawLabel() {
    const el = $("tm-active-draw");
    if (!el) return;
    const res = currentResolution();
    if (res.ok && res.draw) {
      const via = res.source === "date" ? "older date" : "recent list";
      el.textContent =
        "Selected drawing: " +
        dateLong(res.draw.d) +
        " ET  --  " +
        res.draw.n.map(pad2).join("-") +
        " + " +
        pad2(res.draw.s) +
        " (via " +
        via +
        ")";
      setDateMsg("");
      return;
    }
    el.textContent = "Selected drawing: none";
    if (res.error) {
      let msg = res.error;
      if (res.suggestions) {
        const bits = [];
        if (res.suggestions.previous) {
          bits.push("Nearest previous: " + dateLong(res.suggestions.previous) + " ET");
        }
        if (res.suggestions.next) {
          bits.push("Nearest next: " + dateLong(res.suggestions.next) + " ET");
        }
        if (bits.length) msg += " " + bits.join(". ") + ".";
      }
      setDateMsg(msg, true);
    } else {
      setDateMsg("");
    }
  }

  function renderGameToggle() {
    document.querySelectorAll(".tm-game-btn").forEach((btn) => {
      const on = btn.getAttribute("data-game") === state.gameId;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const g = game();
    const root = $("tm-tool");
    if (root) root.setAttribute("data-tm-game", state.gameId);
    const whiteLabel = $("tm-white-legend");
    const bonusLabel = $("tm-bonus-legend");
    if (whiteLabel) {
      whiteLabel.textContent =
        "White balls (pick " + g.pick + " from 1-" + g.mainMax + ")";
    }
    if (bonusLabel) {
      bonusLabel.textContent =
        g.specialName + " (pick 1 from 1-" + g.specialMax + ")";
    }
  }

  function renderGrids() {
    const g = game();
    const whiteGrid = $("tm-white-grid");
    const bonusGrid = $("tm-bonus-grid");
    if (!whiteGrid || !bonusGrid) return;

    whiteGrid.innerHTML = "";
    whiteGrid.setAttribute("aria-label", "White ball picker");
    for (let n = 1; n <= g.mainMax; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tm-pick" + (state.whites.has(n) ? " is-selected" : "");
      btn.textContent = pad2(n);
      btn.setAttribute("aria-pressed", state.whites.has(n) ? "true" : "false");
      btn.setAttribute("aria-label", "White ball " + n);
      btn.dataset.n = String(n);
      btn.addEventListener("click", () => toggleWhite(n));
      whiteGrid.appendChild(btn);
    }

    bonusGrid.innerHTML = "";
    bonusGrid.setAttribute("aria-label", g.specialName + " picker");
    bonusGrid.className =
      "tm-grid tm-grid--bonus" +
      (state.gameId === "powerball" ? " tm-grid--pb" : " tm-grid--mm");
    for (let n = 1; n <= g.specialMax; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tm-pick tm-pick--bonus" + (state.bonus === n ? " is-selected" : "");
      btn.textContent = pad2(n);
      btn.setAttribute("aria-pressed", state.bonus === n ? "true" : "false");
      btn.setAttribute("aria-label", g.specialName + " " + n);
      btn.dataset.n = String(n);
      btn.addEventListener("click", () => toggleBonus(n));
      bonusGrid.appendChild(btn);
    }

    const summary = $("tm-selection");
    if (summary) {
      const empty = state.whites.size === 0 && state.bonus == null;
      if (empty) {
        summary.textContent =
          "Select " + g.pick + " white balls and 1 " + g.specialName;
      } else {
        const whites = [...state.whites].sort((a, b) => a - b).map(pad2).join(" ");
        const bonus = state.bonus == null ? "--" : pad2(state.bonus);
        const whitePart = whites || "-- -- -- -- --";
        summary.textContent =
          whitePart +
          " + " +
          bonus +
          "  (" +
          state.whites.size +
          "/" +
          g.pick +
          " white)";
      }
    }
  }

  function toggleWhite(n) {
    if (state.whites.has(n)) {
      state.whites.delete(n);
    } else if (state.whites.size < game().pick) {
      state.whites.add(n);
    } else {
      setStatus("You already selected " + game().pick + " white balls. Deselect one first.", true);
      return;
    }
    setStatus("");
    renderGrids();
  }

  function toggleBonus(n) {
    state.bonus = state.bonus === n ? null : n;
    setStatus("");
    renderGrids();
  }

  function fillDrawSelect() {
    const sel = $("tm-draw-select");
    const dateInput = $("tm-draw-date");
    if (!sel) return;
    const draws = loadDraws(state.gameId);
    const recent = getRecentDraws(draws, RECENT_DRAW_LIMIT);
    const bounds = drawingDateBounds(draws);

    sel.innerHTML = "";
    if (!recent.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No drawings loaded";
      sel.appendChild(opt);
    } else {
      recent.forEach((draw, i) => {
        const opt = document.createElement("option");
        opt.value = draw.d;
        opt.textContent = formatDrawLabel(draw, i === 0);
        sel.appendChild(opt);
      });
      sel.value = recent[0].d;
    }

    if (dateInput) {
      if (bounds.min) dateInput.min = bounds.min;
      else dateInput.removeAttribute("min");
      if (bounds.max) dateInput.max = bounds.max;
      else dateInput.removeAttribute("max");
      dateInput.value = "";
    }

    state.activeSource = "recent";
    setDateMsg("");
    updateActiveDrawLabel();
  }

  function ballsHtml(numbers, special, opts) {
    const matchedWhites = (opts && opts.matchedWhites) || new Set();
    const bonusMatched = opts && opts.bonusMatched;
    const g = game();
    const main = numbers
      .map((n) => {
        const cls = matchedWhites.has(Number(n)) ? " ball ball--tm-hit" : "ball";
        return '<span class="' + cls + '">' + pad2(n) + "</span>";
      })
      .join("");
    const bonusCls =
      "ball ball--special" + (bonusMatched ? " ball--tm-bonus-hit" : "");
    return (
      '<div class="balls balls--sm">' +
      main +
      '<span class="balls__plus">+</span>' +
      '<span class="' +
      bonusCls +
      '" title="' +
      g.specialName +
      '">' +
      pad2(special) +
      "</span></div>"
    );
  }

  function clearResults() {
    const selected = $("tm-selected-result");
    const history = $("tm-history-result");
    if (selected) {
      selected.hidden = true;
      selected.innerHTML = "";
    }
    if (history) {
      history.hidden = true;
      history.innerHTML = "";
    }
  }

  function runCheck() {
    const g = game();
    const ticket = validateTicket(state.gameId, [...state.whites], state.bonus);
    if (!ticket.ok) {
      setStatus(ticket.error, true);
      clearResults();
      return;
    }

    const draws = loadDraws(state.gameId);
    const res = currentResolution();
    updateActiveDrawLabel();
    if (!res.ok || !res.draw) {
      setStatus(res.error || "No drawing selected.", true);
      clearResults();
      return;
    }

    const draw = res.draw;
    const m = matchTicket(ticket.whites, ticket.bonus, draw.n, draw.s);
    const phrase = describeMatch(m.whiteMatches, m.bonusMatch, g.specialName);
    const hint = softTierHint(m.whiteMatches, m.bonusMatch, state.gameId);
    const matchedSet = new Set(ticket.whites.filter((n) => draw.n.map(Number).includes(n)));

    const selected = $("tm-selected-result");
    selected.hidden = false;
    selected.innerHTML =
      "<h3>Selected drawing comparison</h3>" +
      '<p class="tm-result__date"><time datetime="' +
      draw.d +
      '">' +
      dateLong(draw.d) +
      " ET</time></p>" +
      '<div class="tm-compare">' +
      '<div><p class="tm-compare__label">Official numbers</p>' +
      ballsHtml(draw.n, draw.s, { matchedWhites: matchedSet, bonusMatched: m.bonusMatch }) +
      "</div>" +
      '<div><p class="tm-compare__label">Your numbers</p>' +
      ballsHtml(ticket.whites, ticket.bonus, {
        matchedWhites: matchedSet,
        bonusMatched: m.bonusMatch,
      }) +
      "</div></div>" +
      '<p class="tm-result__phrase" role="status">' +
      phrase +
      "</p>" +
      (hint ? '<p class="tm-result__hint">' + hint + "</p>" : "") +
      '<p class="tm-result__verify">This is a pattern check only  --  not a prize claim and not an official validation. Verify with your state lottery. ' +
      '<a href="' +
      g.prizeChartUrl +
      '" target="_blank" rel="noopener nofollow">' +
      g.prizeChartLabel +
      "</a>.</p>";

    const hist = rankHistory(ticket.whites, ticket.bonus, draws, { limit: 10 });
    const history = $("tm-history-result");
    history.hidden = false;

    if (!hist.ok) {
      history.innerHTML = "<p>" + hist.error + "</p>";
      setStatus("Compared to the selected drawing.", false);
      return;
    }

    const bestPhrase = describeMatch(
      hist.best.whiteMatches,
      hist.best.bonusMatch,
      g.specialName,
    );
    const rows = hist.top
      .map((row) => {
        const hitSet = new Set(
          ticket.whites.filter((n) => row.n.map(Number).includes(n)),
        );
        return (
          '<li class="tm-hist-row">' +
          '<div class="tm-hist-row__meta">' +
          '<time datetime="' +
          row.d +
          '">' +
          dateLong(row.d) +
          "</time>" +
          '<span class="tm-hist-row__match">' +
          describeMatch(row.whiteMatches, row.bonusMatch, g.specialAbbr) +
          "</span></div>" +
          ballsHtml(row.n, row.s, {
            matchedWhites: hitSet,
            bonusMatched: row.bonusMatch,
          }) +
          "</li>"
        );
      })
      .join("");

    const mmNote =
      state.gameId === "megamillions"
        ? '<p class="tm-hist-mm-note">' + MM_MEGA_BALL_HISTORY_NOTE + "</p>"
        : "";

    history.innerHTML =
      "<h3>Historical search (same numbers)</h3>" +
      '<p class="tm-hist-summary">Across <strong>' +
      hist.drawCount.toLocaleString("en-US") +
      "</strong> current-matrix drawings (" +
      dateLong(hist.firstDraw) +
      " - " +
      dateLong(hist.latestDraw) +
      "; " +
      g.matrixLabel +
      " since " +
      g.matrixSinceLabel +
      "). Best match: <strong>" +
      bestPhrase +
      "</strong> (max " +
      hist.maxWhiteMatches +
      " white). That level appears in <strong>" +
      hist.countAtBest.toLocaleString("en-US") +
      "</strong> drawing" +
      (hist.countAtBest === 1 ? "" : "s") +
      ". Showing top " +
      hist.top.length +
      ".</p>" +
      mmNote +
      '<p class="tm-hist-disclaimer">Past similarity does not change future odds. Each drawing is an independent trial.</p>' +
      '<ol class="tm-hist-list">' +
      rows +
      "</ol>";

    setStatus("Compared to the selected drawing and scanned history.", false);
  }

  function clearAll() {
    state.whites = new Set();
    state.bonus = null;
    state.activeSource = "recent";
    setStatus("Pick " + game().pick + " white balls and a " + game().specialName + ", then Check.");
    setDateMsg("");
    clearResults();
    renderGrids();
    const sel = $("tm-draw-select");
    const dateInput = $("tm-draw-date");
    const draws = loadDraws(state.gameId);
    if (sel && draws[0]) sel.value = draws[0].d;
    if (dateInput) dateInput.value = "";
    updateActiveDrawLabel();
  }

  function switchGame(gameId) {
    if (!GAME_RANGES[gameId] || gameId === state.gameId) return;
    state.gameId = gameId;
    state.whites = new Set();
    state.bonus = null;
    state.activeSource = "recent";
    setStatus("Pick " + game().pick + " white balls and a " + game().specialName + ", then Check.");
    setDateMsg("");
    clearResults();
    renderGameToggle();
    renderGrids();
    fillDrawSelect();
  }

  function onRecentChange() {
    state.activeSource = "recent";
    setDateMsg("");
    updateActiveDrawLabel();
  }

  function onDateChange() {
    state.activeSource = "date";
    updateActiveDrawLabel();
  }

  function init() {
    const root = $("tm-tool");
    if (!root) return;

    document.querySelectorAll(".tm-game-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchGame(btn.getAttribute("data-game")));
    });

    const checkBtn = $("tm-check");
    const clearBtn = $("tm-clear");
    if (checkBtn) checkBtn.addEventListener("click", runCheck);
    if (clearBtn) clearBtn.addEventListener("click", clearAll);

    const form = $("tm-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        runCheck();
      });
    }

    const sel = $("tm-draw-select");
    if (sel) {
      sel.addEventListener("change", onRecentChange);
    }
    const dateInput = $("tm-draw-date");
    if (dateInput) {
      dateInput.addEventListener("change", onDateChange);
      dateInput.addEventListener("input", onDateChange);
    }

    renderGameToggle();
    renderGrids();
    fillDrawSelect();
    setStatus("Pick " + game().pick + " white balls and a " + game().specialName + ", then Check.");
  }

  APP.validateTicket = validateTicket;
  APP.matchTicket = matchTicket;
  APP.describeMatch = describeMatch;
  APP.rankHistory = rankHistory;
  APP.buildDrawDateMap = buildDrawDateMap;
  APP.getRecentDraws = getRecentDraws;
  APP.drawingDateBounds = drawingDateBounds;
  APP.lookupDrawByDate = lookupDrawByDate;
  APP.findNearestDrawDates = findNearestDrawDates;
  APP.resolveActiveDraw = resolveActiveDraw;
  APP.RECENT_DRAW_LIMIT = RECENT_DRAW_LIMIT;
  APP.initTicketMatchChecker = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.LOTTO);
