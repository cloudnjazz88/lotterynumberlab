/* Game definitions, drawing history access, schedule maths (US Eastern Time). */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  const TZ = "America/New_York";

  /**
   * Only the current ball matrix of each game is analysed, because a number
   * that did not exist under the old rules cannot be compared with one that
   * did. Mega Millions kept 5/70 but shrank the Mega Ball pool from 25 to 24
   * on 2025-04-08, so that one boundary still matters for the bonus ball.
   */
  const GAMES = [
    {
      id: "megamillions",
      name: "Mega Millions",
      tag: "MM",
      pick: 5,
      mainMax: 70,
      specialMax: 24,
      specialName: "Mega Ball",
      specialAbbr: "MB",
      matrixLabel: "5 of 70 + 1 of 24",
      matrixSince: "2017-10-31",
      matrixSinceLabel: "October 31, 2017",
      specialEras: [
        { from: "2017-10-31", max: 25 },
        { from: "2025-04-08", max: 24 },
      ],
      note:
        "The white balls have been 1–70 since October 31, 2017. On April 8, 2025 the " +
        "Mega Ball pool shrank from 25 to 24 balls, so 25 is kept out of the picks " +
        "while the 2017-onward history is still used for the statistics.",
      drawDays: [2, 5],
      drawDaysLabel: "Tuesdays & Fridays",
      drawTime: { hour: 23, minute: 0 },
      drawTimeLabel: "11:00 p.m. ET",
      jackpotOdds: 290472336,
      ticketPrice: "$5",
      officialUrl: "https://www.megamillions.com/Winning-Numbers/Previous-Drawings.aspx",
      datasetUrl: "https://data.ny.gov/d/5xaw-6ayf",
      windows: [
        {
          id: "matrix",
          label: "Full 5/70 era",
          hint: "Every drawing since October 31, 2017",
        },
        {
          id: "rules2025",
          label: "Current rules only",
          hint: "Since the April 8, 2025 game change",
          from: "2025-04-08",
        },
        { id: "last120", label: "Last 120 drawings", hint: "About 14 months", recent: 120 },
        { id: "last400", label: "Last 400 drawings", hint: "About 4 years", recent: 400 },
      ],
    },
    {
      id: "powerball",
      name: "Powerball",
      tag: "PB",
      pick: 5,
      mainMax: 69,
      specialMax: 26,
      specialName: "Powerball",
      specialAbbr: "PB",
      matrixLabel: "5 of 69 + 1 of 26",
      matrixSince: "2015-10-07",
      matrixSinceLabel: "October 7, 2015",
      specialEras: [{ from: "2015-10-07", max: 26 }],
      note:
        "Powerball has used 5 white balls from 1–69 plus a red Powerball from 1–26 " +
        "since October 7, 2015. A third weekly drawing (Monday) was added on " +
        "August 23, 2021.",
      drawDays: [1, 3, 6],
      drawDaysLabel: "Mondays, Wednesdays & Saturdays",
      drawTime: { hour: 22, minute: 59 },
      drawTimeLabel: "10:59 p.m. ET",
      jackpotOdds: 292201338,
      ticketPrice: "$2",
      officialUrl: "https://www.powerball.com/previous-results",
      datasetUrl: "https://data.ny.gov/d/d6yy-54nr",
      windows: [
        {
          id: "matrix",
          label: "Full 5/69 era",
          hint: "Every drawing since October 7, 2015",
        },
        {
          id: "threeweekly",
          label: "Three drawings a week",
          hint: "Since Monday drawings began, August 23, 2021",
          from: "2021-08-23",
        },
        { id: "last120", label: "Last 120 drawings", hint: "About 9 months", recent: 120 },
        { id: "last400", label: "Last 400 drawings", hint: "About 2.5 years", recent: 400 },
      ],
    },
  ];

  const byId = new Map(GAMES.map((game) => [game.id, game]));

  function game(id) {
    return byId.get(id) || GAMES[0];
  }

  /** Size of the bonus-ball pool on a given drawing date. */
  function specialMaxOn(config, dateStr) {
    let max = config.specialEras[0].max;
    for (const era of config.specialEras) {
      if (dateStr >= era.from) max = era.max;
      else break;
    }
    return max;
  }

  /** Half-way point used for the low/high split (1–35 vs 36–70 etc.). */
  function lowMax(config) {
    return Math.floor(config.mainMax / 2);
  }

  function selectWindow(config, draws, windowId) {
    const spec = config.windows.find((w) => w.id === windowId) || config.windows[0];
    const selected = spec.recent
      ? draws.slice(0, spec.recent)
      : spec.from
        ? draws.filter((d) => d.d >= spec.from)
        : draws.slice();
    return { spec, draws: selected };
  }

  /* ---------------- history loading ---------------- */

  const SOCRATA = {
    megamillions: {
      dataset: "5xaw-6ayf",
      select: "draw_date,winning_numbers,mega_ball",
      specialField: "mega_ball",
    },
    powerball: { dataset: "d6yy-54nr", select: "draw_date,winning_numbers", specialField: null },
  };

  function parseRow(row, spec) {
    const numbers = String(row.winning_numbers ?? "")
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    let main = numbers;
    let special = spec.specialField ? Number(row[spec.specialField]) : NaN;
    if (main.length === 6 && !Number.isInteger(special)) {
      special = main[5];
      main = main.slice(0, 5);
    } else if (main.length === 6) {
      main = main.slice(0, 5);
    }
    if (main.length !== 5 || !Number.isInteger(special)) return null;
    return {
      d: String(row.draw_date).slice(0, 10),
      n: main.slice().sort((a, b) => a - b),
      s: special,
    };
  }

  function normalize(config, history) {
    const draws = (history.draws || [])
      .filter((d) => d && Array.isArray(d.n) && d.n.length === config.pick)
      .filter((d) => d.d >= config.matrixSince)
      .sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
    return {
      source: history.source || "unknown",
      live: Boolean(history.live),
      count: draws.length,
      latestDraw: draws.length ? draws[0].d : null,
      firstDraw: draws.length ? draws[draws.length - 1].d : null,
      draws,
    };
  }

  /** Snapshot bundled with the app: works offline and from file://. */
  function loadBundled() {
    const snapshot = window.LOTTO_SNAPSHOT;
    if (!snapshot || !snapshot.games) return null;
    const games = {};
    for (const config of GAMES) {
      const history = snapshot.games[config.id];
      if (history) games[config.id] = normalize(config, history);
    }
    return { fetchedAt: snapshot.fetchedAt || null, games };
  }

  /** Pull the newest results for one game straight from the open-data portal. */
  async function fetchLive(config) {
    const spec = SOCRATA[config.id];
    const url =
      `https://data.ny.gov/resource/${spec.dataset}.json` +
      `?$select=${encodeURIComponent(spec.select)}` +
      `&$where=${encodeURIComponent(`draw_date >= '${config.matrixSince}'`)}` +
      `&$order=${encodeURIComponent("draw_date DESC")}&$limit=50000`;

    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`data server replied ${res.status}`);
    const rows = await res.json();
    const draws = rows.map((row) => parseRow(row, spec)).filter(Boolean);
    if (draws.length < 100) throw new Error("too few drawings returned");
    return normalize(config, { source: "data.ny.gov (live)", live: true, draws });
  }

  /* ---------------- Eastern Time schedule ---------------- */

  function tzOffsetMs(instant) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const p = {};
    for (const part of fmt.formatToParts(instant)) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUTC - instant.getTime();
  }

  /** UTC instant for a wall-clock time in New York (handles DST). */
  function easternTimeToInstant(y, m, d, hour, minute) {
    let guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
    for (let i = 0; i < 3; i++) {
      guess = new Date(Date.UTC(y, m - 1, d, hour, minute) - tzOffsetMs(guess));
    }
    return guess;
  }

  function nextDrawing(config, now = new Date()) {
    const easternNow = new Date(now.getTime() + tzOffsetMs(now));
    for (let add = 0; add < 9; add++) {
      const probe = new Date(easternNow.getTime() + add * 86400000);
      if (!config.drawDays.includes(probe.getUTCDay())) continue;
      const instant = easternTimeToInstant(
        probe.getUTCFullYear(),
        probe.getUTCMonth() + 1,
        probe.getUTCDate(),
        config.drawTime.hour,
        config.drawTime.minute,
      );
      if (instant.getTime() > now.getTime()) return instant;
    }
    return null;
  }

  const easternDateTime = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  APP.data = {
    TZ,
    GAMES,
    game,
    specialMaxOn,
    lowMax,
    selectWindow,
    loadBundled,
    fetchLive,
    nextDrawing,
    easternDateTime,
  };
})(window.LOTTO);
