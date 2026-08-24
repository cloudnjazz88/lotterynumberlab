/*
 * UI wiring for the generator pages. Each page is a real HTML document that
 * declares its game in `body[data-game]`; there is no client-side routing.
 */
(function (APP) {
  "use strict";

  const { data, stats: statsLib, generator, charts } = APP;
  const STORAGE_KEY = "lotto-generator-settings-v1";
  const GAME_RECENT = 14;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = {
    body: document.body,
    generateBtn: $("generateBtn"),
    games: $("games"),
    ballLegend: $("ballLegend"),
    copyAll: $("copyAll"),
    genMeta: $("genMeta"),
    windowSelect: $("windowSelect"),
    windowHint: $("windowHint"),
    presets: $("presets"),
    matchPatterns: $("matchPatterns"),
    avoidPast: $("avoidPast"),
    maxOverlap: $("maxOverlap"),
    refreshBtn: $("refreshBtn"),
    refreshStatus: $("refreshStatus"),
    dataSource: $("dataSource"),
    tabs: $("tabs"),
    summary: $("summary"),
    chartMain: $("chartMain"),
    chartSpecial: $("chartSpecial"),
    chartSum: $("chartSum"),
    sumLegend: $("sumLegend"),
    numberGrid: $("numberGrid"),
    recentDraws: $("recentDraws"),
    toast: $("toast"),
  };

  const sliders = ["freq", "gap", "momentum", "pair"].map((key) => ({
    key,
    input: $("w" + key[0].toUpperCase() + key.slice(1)),
    output: $("w" + key[0].toUpperCase() + key.slice(1) + "Out"),
  }));

  const state = {
    snapshot: null,
    view: document.body.dataset.view || "page",
    config: null,
    settings: {},
    stats: null,
    historySets: new Set(),
    batch: null,
    tab: "main",
  };

  /* ---------------- formatting helpers ---------------- */

  const dateShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const dateLong = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function drawDate(iso, fmt) {
    if (!iso) return "–";
    const [y, m, d] = iso.split("-").map(Number);
    return fmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
  }

  function nextDrawingLabel(config) {
    const next = data.nextDrawing(config);
    return next ? `${data.easternDateTime.format(next)} ET` : "–";
  }

  let toastTimer = null;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-on"), 2400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  /* ---------------- settings ---------------- */

  function defaultSettings() {
    return {
      windowId: "matrix",
      weights: { ...generator.PRESETS.balanced },
      preset: "balanced",
      matchPatterns: true,
      avoidPast: true,
      maxOverlap: 3,
    };
  }

  function settingsFor(gameId) {
    if (!state.settings[gameId]) state.settings[gameId] = defaultSettings();
    return state.settings[gameId];
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch {
      /* storage unavailable — settings just won't persist */
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      for (const config of data.GAMES) {
        const entry = saved[config.id];
        if (!entry) continue;
        const merged = defaultSettings();
        if (config.windows.some((w) => w.id === entry.windowId)) merged.windowId = entry.windowId;
        if (entry.weights) merged.weights = { ...merged.weights, ...entry.weights };
        if (entry.preset) merged.preset = entry.preset;
        merged.matchPatterns = entry.matchPatterns !== false;
        merged.avoidPast = entry.avoidPast !== false;
        if (entry.maxOverlap) merged.maxOverlap = Number(entry.maxOverlap);
        state.settings[config.id] = merged;
      }
    } catch {
      /* ignore malformed settings */
    }
  }

  /* ---------------- shared ball markup ---------------- */

  function ballClass(info) {
    if (!info) return "";
    if (info.gap >= info.expectedGap * 2.6) return " ball--due";
    if (info.momentum >= 1.6) return " ball--hot";
    if (info.momentum <= 0.62) return " ball--cold";
    return "";
  }

  function ballTitle(config, info, kind) {
    if (!info) return "";
    const label = kind === "special" ? config.specialName : "white ball";
    return [
      `${info.n} (${label})`,
      `drawn ${info.count} times, expected ${info.expected.toFixed(1)} (index ${info.rawRatio.toFixed(2)})`,
      `${info.recentCount} times in the last ${statsLib.MOMENTUM_WINDOW} drawings`,
      info.lastDate
        ? `last seen ${info.gap} drawing${info.gap === 1 ? "" : "s"} ago (${info.lastDate})`
        : "not drawn in this window",
    ].join("\n");
  }

  function staticBalls(config, numbers, special) {
    const main = numbers.map((n) => `<span class="ball">${pad(n)}</span>`).join("");
    return (
      `${main}<span class="balls__plus">+</span>` +
      `<span class="ball ball--special" title="${config.specialName}">${pad(special)}</span>`
    );
  }

  /* ---------------- generated lines ---------------- */

  function scoreClass(score) {
    if (score >= 70) return "score--high";
    if (score >= 40) return "score--mid";
    return "score--low";
  }

  function scoreTitle(game) {
    const t = game.targets;
    return [
      "How common this shape (sum, odd/even, low/high, decade spread, consecutive pairs)",
      "is among real winning combinations, on a 0–100 scale. A low score is still a shape",
      "that has genuinely occurred, and it says nothing about your chance of winning.",
      t
        ? `Target for this line: ${t.odd}:${t.pick - t.odd} odd/even · ${t.low}:${
            t.pick - t.low
          } low/high · sum ${t.sumMin}–${t.sumMax}`
        : "Generated without the shape filter",
    ].join("\n");
  }

  function lineText(config, game) {
    return `Line ${game.index}:  ${game.numbers.map(pad).join(" ")}   ${config.specialAbbr} ${pad(
      game.special,
    )}`;
  }

  function renderGames(batch) {
    const config = state.config;
    el.games.innerHTML = "";

    batch.games.forEach((game, gi) => {
      const row = document.createElement("div");
      row.className = "game";
      row.style.animationDelay = `${gi * 60}ms`;

      const balls = game.numbers
        .map(
          (n, i) =>
            `<span class="ball${ballClass(game.details[i])}" title="${ballTitle(
              config,
              game.details[i],
            )}" data-final="${pad(n)}" data-max="${config.mainMax}"></span>`,
        )
        .join("");

      const m = game.measures;
      row.innerHTML = `
        <div class="game__no">${game.index}</div>
        <div class="game__main">
          <div class="balls">
            ${balls}
            <span class="balls__plus">+</span>
            <span class="ball ball--special${ballClass(game.specialDetail)}" title="${ballTitle(
              config,
              game.specialDetail,
              "special",
            )}" data-final="${pad(game.special)}" data-max="${config.specialMax}"></span>
          </div>
          <div class="game__facts">
            <span>sum <b>${m.sum}</b></span>
            <span>odd/even <b>${m.odd}:${m.even}</b></span>
            <span>low/high <b>${m.low}:${m.high}</b></span>
            <span>decades <b>${m.buckets}</b></span>
            <span>consecutive <b>${m.consecutive || "none"}</b></span>
          </div>
        </div>
        <div class="game__side">
          <div class="score ${scoreClass(game.score)}" title="${scoreTitle(game)}">
            <div class="score__value">${game.score}</div>
            <div class="score__label">shape match</div>
          </div>
          <button class="btn" type="button" data-copy="${gi}">Copy</button>
        </div>`;

      el.games.appendChild(row);
    });

    el.games.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const game = batch.games[Number(btn.dataset.copy)];
        if (await copyText(lineText(config, game).replace(/\s+/g, " ").trim())) {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1400);
        }
      });
    });

    animateBalls();
  }

  function animateBalls() {
    el.games.querySelectorAll(".game").forEach((row, rowIndex) => {
      row.querySelectorAll(".ball[data-final]").forEach((ball, ballIndex) => {
        rollBall(ball, 200 + ballIndex * 45 + rowIndex * 55);
      });
    });
  }

  /** Slot-machine roll that settles on the ball's final number. */
  function rollBall(ball, duration) {
    const final = ball.dataset.final;
    if (reduceMotion) {
      ball.textContent = final;
      return;
    }
    const max = Number(ball.dataset.max);
    const start = performance.now();
    let tick = -1;
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        ball.textContent = final;
        return;
      }
      const slot = Math.floor(elapsed / 55);
      if (slot !== tick) {
        tick = slot;
        ball.textContent = pad(1 + Math.floor(Math.random() * max));
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- statistics dashboard ---------------- */

  function summaryItem(label, value, sub) {
    return `<div class="summary__item">
        <span class="summary__label">${label}</span>
        <div class="summary__value">${value}${sub ? ` <small>${sub}</small>` : ""}</div>
      </div>`;
  }

  function renderSummary() {
    const s = state.stats;
    const st = s.structure;
    const pick = state.config.pick;
    const oddMode = statsLib.modeOf(st.oddDist);
    const consecRate = 1 - st.consecDist[0] / st.total;
    const longest = s.overdue[0];

    el.summary.innerHTML = [
      summaryItem("Drawings analysed", s.windowCount.toLocaleString("en-US"), `since ${drawDate(s.from, dateLong)}`),
      summaryItem("Average sum", st.sums.mean.toFixed(1), `σ ${st.sums.sd.toFixed(1)}`),
      summaryItem(
        "Most common odd/even",
        `${oddMode}:${pick - oddMode}`,
        `${((st.oddDist[oddMode] / st.total) * 100).toFixed(1)}%`,
      ),
      summaryItem("Has consecutive pair", `${(consecRate * 100).toFixed(1)}%`, "of drawings"),
      summaryItem("Repeats a previous ball", `${(st.repeatRate * 100).toFixed(1)}%`, "1 or more"),
      summaryItem("Longest dry spell", `#${longest.n}`, `${longest.gap} drawings`),
    ].join("");
  }

  function pickedMain() {
    const set = new Set();
    if (state.batch) for (const g of state.batch.games) for (const n of g.numbers) set.add(n);
    return set;
  }

  function pickedSpecial() {
    const set = new Set();
    if (state.batch) for (const g of state.batch.games) set.add(g.special);
    return set;
  }

  function renderCharts() {
    const config = state.config;
    const s = state.stats;
    const main = s.main.numbers;

    charts.bars(el.chartMain, {
      values: main.map((x) => x.count),
      highlight: pickedMain(),
      baseline: main.reduce((a, b) => a + b.expected, 0) / main.length,
      baselineLabel: "expected",
      tickEvery: 5,
      tipOf: (i) => {
        const x = main[i];
        return (
          `<b>Ball ${x.n}</b> · drawn ${x.count} times<br>` +
          `expected ${x.expected.toFixed(1)} · index ${x.rawRatio.toFixed(2)}<br>` +
          `${x.recentCount} in last ${statsLib.MOMENTUM_WINDOW} · last seen ${x.gap} ago`
        );
      },
    });

    const special = s.special.numbers;
    charts.bars(el.chartSpecial, {
      values: special.map((x) => x.count),
      highlight: pickedSpecial(),
      baseline: special.reduce((a, b) => a + b.expected, 0) / special.length,
      baselineLabel: "expected",
      tickEvery: 2,
      tipOf: (i) => {
        const x = special[i];
        return (
          `<b>${config.specialName} ${x.n}</b> · drawn ${x.count} times<br>` +
          `expected ${x.expected.toFixed(1)} · index ${x.rawRatio.toFixed(2)}<br>` +
          `last seen ${x.gap} drawings ago`
        );
      },
    });

    const st = s.structure;
    charts.histogram(el.chartSum, {
      counts: st.sums.hist,
      bin: st.sums.bin,
      from: Math.max(0, st.sums.min - st.sums.bin),
      to: Math.min(config.mainMax * config.pick, st.sums.max + st.sums.bin * 2),
      total: st.total,
      markers: state.batch ? state.batch.games.map((g) => g.measures.sum) : [],
    });

    el.sumLegend.innerHTML =
      `<span>Average <b>${st.sums.mean.toFixed(1)}</b></span>` +
      `<span>Middle 80% <b>${Math.round(st.sums.q(0.1))}–${Math.round(st.sums.q(0.9))}</b></span>` +
      `<span>Lowest ${st.sums.min} / highest ${st.sums.max}</span>` +
      (state.batch
        ? `<span>Your sums <b>${state.batch.games
            .map((g) => g.measures.sum)
            .join(", ")}</b></span>`
        : "");
  }

  // Blue -> violet -> coral -> gold: a ramp that stays saturated all the way
  // through, unlike a direct blue-to-warm blend which passes through mud.
  const HEAT_STOPS = [
    { t: 0, c: [45, 62, 130, 0.35] },
    { t: 0.35, c: [92, 98, 192, 0.45] },
    { t: 0.6, c: [150, 92, 180, 0.5] },
    { t: 0.82, c: [226, 112, 100, 0.6] },
    { t: 1, c: [255, 194, 51, 0.78] },
  ];

  function heatColor(ratio) {
    const t = Math.min(1, Math.max(0, (ratio - 0.78) / 0.44));
    let i = 0;
    while (i < HEAT_STOPS.length - 2 && t > HEAT_STOPS[i + 1].t) i++;
    const a = HEAT_STOPS[i];
    const b = HEAT_STOPS[i + 1];
    const local = (t - a.t) / (b.t - a.t);
    const mix = a.c.map((v, k) => v + (b.c[k] - v) * local);
    return `rgba(${mix[0].toFixed(0)}, ${mix[1].toFixed(0)}, ${mix[2].toFixed(0)}, ${mix[3].toFixed(2)})`;
  }

  function renderGrid() {
    const picked = pickedMain();
    el.numberGrid.innerHTML = state.stats.main.numbers
      .map(
        (x) => `<div class="cell${picked.has(x.n) ? " is-picked" : ""}" style="background:${heatColor(
          x.rawRatio,
        )}" title="${ballTitle(state.config, x)}">
            <span class="cell__n">${x.n}</span>
            <span class="cell__gap">${x.gap}</span>
          </div>`,
      )
      .join("");
  }

  function renderRecent() {
    const config = state.config;
    const history = state.snapshot.games[config.id];
    el.recentDraws.innerHTML = history.draws
      .slice(0, GAME_RECENT)
      .map((draw) => {
        const sum = draw.n.reduce((a, b) => a + b, 0);
        return `<div class="draw-row">
            <span class="draw-row__date">${drawDate(draw.d, dateShort)}</span>
            ${staticBalls(config, draw.n, draw.s)}
            <span class="draw-row__sum">sum ${sum}</span>
          </div>`;
      })
      .join("");
  }

  /* ---------------- game view plumbing ---------------- */

  function recompute() {
    const config = state.config;
    const settings = settingsFor(config.id);
    const history = state.snapshot.games[config.id];
    const { spec, draws } = data.selectWindow(config, history.draws, settings.windowId);

    state.stats = statsLib.analyze(config, draws, history.draws);
    el.windowHint.textContent =
      `${spec.hint} · ${draws.length.toLocaleString("en-US")} drawings` +
      (state.stats.structureFallback
        ? ` (shape statistics use all ${state.stats.structureCount} for a bigger sample)`
        : "");

    renderSummary();
    renderGrid();
    renderRecent();
    renderCharts();
  }

  /** Only the parts of the page that depend on live data or user settings. */
  function renderGameChrome() {
    const config = state.config;
    const history = state.snapshot.games[config.id];

    el.windowSelect.innerHTML = config.windows
      .map((w) => `<option value="${w.id}">${w.label}</option>`)
      .join("");

    el.dataSource.textContent =
      `Source: ${history.source}` +
      (state.snapshot.fetchedAt
        ? ` · snapshot ${new Date(state.snapshot.fetchedAt).toLocaleString("en-US")}`
        : "");
    el.refreshStatus.textContent = "";
  }

  function syncControls() {
    const settings = settingsFor(state.config.id);
    el.windowSelect.value = settings.windowId;
    el.matchPatterns.checked = settings.matchPatterns;
    el.avoidPast.checked = settings.avoidPast;
    el.maxOverlap.value = String(settings.maxOverlap);
    for (const s of sliders) {
      s.input.value = String(settings.weights[s.key]);
      s.output.textContent = Number(settings.weights[s.key]).toFixed(2);
    }
    syncPresetChips();
  }

  function syncPresetChips() {
    const settings = settingsFor(state.config.id);
    el.presets.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.dataset.preset === settings.preset);
    });
  }

  function matchPreset() {
    const settings = settingsFor(state.config.id);
    const found = Object.entries(generator.PRESETS).find(([, preset]) =>
      Object.keys(preset).every((k) => Math.abs(preset[k] - settings.weights[k]) < 0.001),
    );
    settings.preset = found ? found[0] : "custom";
  }

  function generate() {
    const config = state.config;
    const settings = settingsFor(config.id);
    const spec = config.windows.find((w) => w.id === settings.windowId);
    el.generateBtn.disabled = true;

    state.batch = generator.generate(state.stats, {
      games: 5,
      weights: settings.weights,
      matchPatterns: settings.matchPatterns,
      avoidPastWinners: settings.avoidPast,
      maxOverlap: settings.maxOverlap,
      historySets: state.historySets,
    });

    renderGames(state.batch);
    renderCharts();
    renderGrid();
    el.copyAll.disabled = false;
    el.ballLegend.hidden = false;

    const relaxed = state.batch.games.some((g) => g.relaxedTier > 0);
    const attempts = state.batch.games.reduce((a, g) => a + g.attempts, 0);
    el.genMeta.textContent =
      `${spec.label} · ${state.stats.windowCount.toLocaleString("en-US")} drawings · ` +
      `${settings.matchPatterns ? "shape filter on" : "shape filter off"} · ` +
      `${attempts} draw attempts${relaxed ? " (some checks relaxed)" : ""} · ` +
      new Date().toLocaleTimeString("en-US");

    setTimeout(() => {
      el.generateBtn.disabled = false;
    }, 420);
  }

  /* ---------------- page boot ---------------- */

  /** Fills every "next drawing" placeholder the static HTML left behind. */
  function fillNextDrawings() {
    document.querySelectorAll("[data-next-drawing]").forEach((node) => {
      const config = data.game(node.dataset.nextDrawing);
      if (config) node.textContent = nextDrawingLabel(config);
    });
  }

  function startGame(gameId) {
    const config = data.game(gameId);
    state.config = config;
    state.batch = null;
    state.historySets = new Set(
      state.snapshot.games[config.id].draws.map((d) => d.n.join("-")),
    );

    renderGameChrome();
    syncControls();
    recompute();
  }

  /* ---------------- events ---------------- */

  function bindEvents() {
    el.generateBtn.addEventListener("click", generate);

    el.copyAll.addEventListener("click", async () => {
      if (!state.batch) return;
      const config = state.config;
      const header = `${config.name} — 5 lines (${new Date().toLocaleDateString("en-US")})`;
      const body = state.batch.games.map((g) => lineText(config, g)).join("\n");
      const footer = `Based on ${state.stats.windowCount} drawings since ${drawDate(
        state.stats.from,
        dateLong,
      )}`;
      if (await copyText(`${header}\n${body}\n${footer}`)) toast("5 lines copied to clipboard");
    });

    el.windowSelect.addEventListener("change", () => {
      settingsFor(state.config.id).windowId = el.windowSelect.value;
      recompute();
      saveSettings();
    });

    el.presets.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-preset]");
      if (!btn) return;
      const settings = settingsFor(state.config.id);
      settings.preset = btn.dataset.preset;
      settings.weights = { ...generator.PRESETS[settings.preset] };
      syncControls();
      saveSettings();
    });

    for (const s of sliders) {
      s.input.addEventListener("input", () => {
        const settings = settingsFor(state.config.id);
        settings.weights[s.key] = Number(s.input.value);
        s.output.textContent = Number(s.input.value).toFixed(2);
        matchPreset();
        syncPresetChips();
        saveSettings();
      });
    }

    el.matchPatterns.addEventListener("change", () => {
      settingsFor(state.config.id).matchPatterns = el.matchPatterns.checked;
      saveSettings();
    });

    el.avoidPast.addEventListener("change", () => {
      settingsFor(state.config.id).avoidPast = el.avoidPast.checked;
      saveSettings();
    });

    el.maxOverlap.addEventListener("change", () => {
      settingsFor(state.config.id).maxOverlap = Number(el.maxOverlap.value);
      saveSettings();
    });

    el.tabs.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-tab]");
      if (!btn) return;
      state.tab = btn.dataset.tab;
      el.tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-on", t === btn));
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("is-on", panel.dataset.panel === state.tab);
      });
      renderCharts();
    });

    el.refreshBtn.addEventListener("click", async () => {
      const config = state.config;
      el.refreshBtn.disabled = true;
      el.refreshStatus.textContent = "Fetching the latest results…";
      try {
        const live = await data.fetchLive(config);
        const before = state.snapshot.games[config.id].latestDraw;
        state.snapshot.games[config.id] = live;
        state.historySets = new Set(live.draws.map((d) => d.n.join("-")));
        renderGameChrome();
        syncControls();
        recompute();
        el.refreshStatus.textContent =
          live.latestDraw === before
            ? `Already up to date (through ${drawDate(live.latestDraw, dateLong)})`
            : `Updated through ${drawDate(live.latestDraw, dateLong)}`;
        toast(`${live.count.toLocaleString("en-US")} ${config.name} drawings loaded`);
      } catch (error) {
        el.refreshStatus.textContent = `Could not refresh (${error.message}) — using the bundled snapshot.`;
      } finally {
        el.refreshBtn.disabled = false;
      }
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.config) renderCharts();
      }, 160);
    });
  }

  /* ---------------- init ---------------- */

  function init() {
    fillNextDrawings();
    if (state.view !== "game") return;

    const gameId = el.body.dataset.game;
    const snapshot = data.loadBundled();
    if (!snapshot || !snapshot.games[gameId]) {
      el.games.innerHTML =
        '<div class="empty-state"><p>Could not load the drawing history.</p>' +
        "<span>Check that <b>data/draws.js</b> exists, or run <b>npm run update-data</b> to " +
        "download it again.</span></div>";
      return;
    }

    state.snapshot = snapshot;
    loadSettings();
    bindEvents();
    startGame(gameId);
  }

  init();
})(window.LOTTO);
