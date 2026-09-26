/**
 * Pure spending-calculator math (Node + browser parity).
 */

export function computeSpending(input) {
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
