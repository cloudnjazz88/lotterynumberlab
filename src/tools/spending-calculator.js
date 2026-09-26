/* Lottery spending calculator — all math client-side. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  const PRESETS = {
    megamillions: { costPerPlay: 5, drawingsPerWeek: 2, oddsGame: "megamillions" },
    powerball: { costPerPlay: 2, drawingsPerWeek: 3, oddsGame: "powerball" },
    custom: null,
  };

  const JACKPOT_ODDS = {
    megamillions: 290472336,
    powerball: 292201338,
  };

  /**
   * Pure calculation used by the UI and by unit tests.
   * @param {{costPerPlay:number, playsPerDrawing:number, drawingsPerWeek:number, horizonYears:number, jackpotOdds?:number|null}} input
   */
  function computeSpending(input) {
    const cost = Number(input.costPerPlay);
    const plays = Number(input.playsPerDrawing);
    const drawings = Number(input.drawingsPerWeek);
    const years = Number(input.horizonYears);
    if (![cost, plays, drawings, years].every((n) => Number.isFinite(n) && n > 0)) {
      return { ok: false, error: "Enter positive numbers for cost, plays, drawings, and horizon." };
    }
    if (cost > 1000 || plays > 10000 || drawings > 21 || years > 100) {
      return { ok: false, error: "One or more inputs are outside the allowed range." };
    }

    const weekly = cost * plays * drawings;
    const annual = weekly * 52;
    const monthly = annual / 12;
    const periodTotal = annual * years;
    const playsPurchased = plays * drawings * 52 * years;

    let jackpotContext = null;
    const odds = input.jackpotOdds == null ? null : Number(input.jackpotOdds);
    if (odds && odds > 1 && Number.isFinite(odds)) {
      const p = 1 / odds;
      // 1 - (1 - p)^n ; use expm1/log1p for stability when n*p is tiny
      const atLeastOne = -Math.expm1(playsPurchased * Math.log1p(-p));
      jackpotContext = {
        oddsOneIn: odds,
        plays: playsPurchased,
        atLeastOneProbability: atLeastOne,
      };
    }

    return {
      ok: true,
      weekly,
      monthly,
      annual,
      periodTotal,
      playsPurchased,
      jackpotContext,
    };
  }

  function money(n) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }

  function pct(p) {
    if (p >= 0.01) return (p * 100).toFixed(2) + "%";
    if (p >= 1e-6) return (p * 100).toFixed(4) + "%";
    return p.toExponential(2);
  }

  function readForm(form) {
    const costPerPlay = Number(form.costPerPlay.value);
    const playsPerDrawing = Number(form.playsPerDrawing.value);
    const drawingsPerWeek = Number(form.drawingsPerWeek.value);
    const horizonYears = Number(form.horizonYears.value);
    const oddsGame = form.oddsGame.value;
    const jackpotOdds = oddsGame === "none" ? null : JACKPOT_ODDS[oddsGame] || null;
    // Prefer live game config when APP.game exists
    if (oddsGame !== "none" && APP.game) {
      try {
        const g = APP.game(oddsGame);
        if (g && g.jackpotOdds) return {
          costPerPlay, playsPerDrawing, drawingsPerWeek, horizonYears, jackpotOdds: g.jackpotOdds, oddsGame,
        };
      } catch (_) { /* ignore */ }
    }
    return { costPerPlay, playsPerDrawing, drawingsPerWeek, horizonYears, jackpotOdds, oddsGame };
  }

  function render(result, oddsGame) {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const status = document.getElementById("spending-status");
    if (!result.ok) {
      if (status) status.textContent = result.error;
      set("out-weekly", "—");
      set("out-monthly", "—");
      set("out-annual", "—");
      set("out-period", "—");
      set("out-plays", "—");
      set("out-odds", "—");
      return;
    }
    if (status) status.textContent = "Updated from your inputs.";
    set("out-weekly", money(result.weekly));
    set("out-monthly", money(result.monthly));
    set("out-annual", money(result.annual));
    set("out-period", money(result.periodTotal));
    set("out-plays", result.playsPurchased.toLocaleString("en-US"));
    if (result.jackpotContext) {
      const j = result.jackpotContext;
      const label = oddsGame === "megamillions" ? "Mega Millions" : oddsGame === "powerball" ? "Powerball" : "Selected game";
      set(
        "out-odds",
        `${label}: 1 in ${j.oddsOneIn.toLocaleString("en-US")}; ≈ ${pct(j.atLeastOneProbability)} chance at least one jackpot across ${j.plays.toLocaleString("en-US")} plays (still nearly impossible for typical budgets).`,
      );
    } else {
      set("out-odds", "No game selected — cost figures only.");
    }
  }

  function applyPreset(name, form) {
    const preset = PRESETS[name];
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-preset") === name);
    });
    if (!preset) return;
    form.costPerPlay.value = String(preset.costPerPlay);
    form.drawingsPerWeek.value = String(preset.drawingsPerWeek);
    form.oddsGame.value = preset.oddsGame;
  }

  function init() {
    const form = document.getElementById("spending-form");
    if (!form) return;

    const update = () => render(computeSpending(readForm(form)), form.oddsGame.value);

    form.addEventListener("input", update);
    form.addEventListener("change", update);

    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPreset(btn.getAttribute("data-preset"), form);
        update();
      });
    });

    // Default to Powerball preset for a realistic first view
    applyPreset("powerball", form);
    update();
  }

  APP.computeSpending = computeSpending;
  APP.initSpendingCalculator = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.LOTTO);
