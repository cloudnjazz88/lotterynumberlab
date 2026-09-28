/**
 * Long-form guides. Every number is interpolated from the computed context so
 * the prose cannot drift away from the data or the published game rules.
 */

import { num, pct, oneIn, money, table, callout, dateLong, adSlot, sourceList } from "./site.mjs";
import { comparisonRows } from "../tools/more-tickets-math.mjs";
import { illustrativeAnnuityShareRows } from "../tools/shared-jackpot-math.mjs";
import {
  WINNER_DISCLOSURE_RULES,
  WINNER_DISCLOSURE_VERIFIED_ON,
  DISCLOSURE_CATEGORY_LABELS,
  disclosureCategoryCounts,
  jurisdictionDirectoryRows,
} from "./winner-disclosure-rules.mjs";

/* ---------------------------------- 1 ------------------------------------- */

const oddsCompared = {
  slug: "mega-millions-vs-powerball-odds",
  kicker: "Odds",
  title: "Mega Millions vs Powerball: the odds compared, tier by tier",
  dek: "Both jackpots are advertised in the hundreds of millions and both are almost impossibly unlikely — but the two games are not equally hard, and the smaller tiers differ a lot.",
  description:
    "A tier-by-tier comparison of Mega Millions and Powerball odds, computed from the published ball matrices: jackpot odds, overall odds, prize structures and what each ticket returns.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const harder = pb.config.jackpotOdds / mm.config.jackpotOdds - 1;

    return `
<p class="lede">
  Mega Millions and Powerball are the only two lotteries sold in nearly every US
  jurisdiction, and their jackpots are quoted in the same breath. Their odds are close enough
  that the difference barely matters emotionally — and far enough apart to be worth
  understanding before you decide which ticket to buy.
</p>

<h2>Where the jackpot odds come from</h2>
<p>
  Both games work the same way: five white balls are drawn from one pool, and a single
  coloured ball is drawn from a second, separate pool. Because the order of the five white
  balls is irrelevant, the number of distinct white-ball sets is a combination, written
  C(n,&nbsp;5), and the total number of possible tickets is that figure multiplied by the size
  of the bonus pool.
</p>
${table(
  ["Game", "Matrix", "White-ball sets", "Bonus pool", "Possible tickets"],
  [
    [
      mm.config.name,
      mm.config.matrixLabel,
      num(mm.config.jackpotOdds / mm.config.specialMax),
      `${mm.config.specialMax} (${mm.config.specialName})`,
      `<b>${num(mm.config.jackpotOdds)}</b>`,
    ],
    [
      pb.config.name,
      pb.config.matrixLabel,
      num(pb.config.jackpotOdds / pb.config.specialMax),
      `${pb.config.specialMax} (${pb.config.specialName})`,
      `<b>${num(pb.config.jackpotOdds)}</b>`,
    ],
  ],
)}
<p>
  So Powerball's jackpot is ${pct(harder, 1)} harder to hit than Mega Millions' —
  ${oneIn(pb.config.jackpotOdds)} against ${oneIn(mm.config.jackpotOdds)}. That gap is real
  but tiny in human terms: both are somewhere between "struck by lightning twice" and "never".
  The more interesting differences are below the jackpot.
</p>

<h2>Mega Millions: every prize tier</h2>
<p>
  Since ${dateLong(mm.config.matrixSince)} the white balls have run 1–${mm.config.mainMax}, and
  since ${dateLong("2025-04-08")} the ${mm.config.specialName} pool has been
  1–${mm.config.specialMax}. A play costs ${mm.config.ticketPrice} and carries a built-in
  random multiplier of 2X, 3X, 4X, 5X or 10X that applies to every non-jackpot prize, which is
  why the smallest possible win is $10 rather than the base $5.
</p>
${table(
  ["Match", "Base prize", "Odds"],
  mm.table.rows.map((r) => [
    r.match,
    r.prize === "Jackpot" ? "<b>Jackpot</b>" : r.prize,
    oneIn(r.oneIn),
  ]),
  { caption: `Overall odds of winning any prize: ${oneIn(mm.table.anyPrizeOneIn)}.` },
)}

<h2>Powerball: every prize tier</h2>
<p>
  Powerball has used 1–${pb.config.mainMax} white balls and a 1–${pb.config.specialMax} red
  ${pb.config.specialName} since ${dateLong(pb.config.matrixSince)}. A play costs
  ${pb.config.ticketPrice}; the 2X–10X Power Play multiplier is a separate $1 add-on rather
  than being included.
</p>
${table(
  ["Match", "Base prize", "Odds"],
  pb.table.rows.map((r) => [
    r.match,
    r.prize === "Jackpot" ? "<b>Jackpot</b>" : r.prize,
    oneIn(r.oneIn),
  ]),
  { caption: `Overall odds of winning any prize: ${oneIn(pb.table.anyPrizeOneIn)}.` },
)}

${adSlot("guide-mid")}

<h2>What each ticket actually returns</h2>
<p>
  Add up every fixed tier — prize multiplied by probability — and you get the part of a
  ticket's value that does not depend on the jackpot. It is the only part you can calculate
  without knowing tonight's advertised prize.
</p>
${table(
  ["", mm.config.name, pb.config.name],
  [
    ["Ticket price", mm.config.ticketPrice, pb.config.ticketPrice],
    [
      "Fixed-prize expected value",
      `$${mm.breakEvenBase.fixedEv.toFixed(2)}`,
      `$${pb.breakEvenBase.fixedEv.toFixed(2)}`,
    ],
    [
      "As a share of the price",
      pct(mm.breakEvenBase.fixedReturn),
      pct(pb.breakEvenBase.fixedReturn),
    ],
    ["Odds of any prize", oneIn(mm.table.anyPrizeOneIn), oneIn(pb.table.anyPrizeOneIn)],
    ["Drawings per week", String(mm.config.drawDays.length), String(pb.config.drawDays.length)],
  ],
  { className: "table--compare" },
)}
<p>
  Powerball returns more of its ticket price through fixed prizes
  (${pct(pb.breakEvenBase.fixedReturn)} versus ${pct(mm.breakEvenBase.fixedReturn)}), but the
  comparison is not apples to apples: Mega Millions multiplies every one of those prizes by at
  least 2X automatically, while matching Powerball's multiplier costs an extra dollar. Include
  the Mega Millions multiplier at its typical value and the two games' fixed returns land in
  the same neighbourhood — roughly a fifth of the ticket price, with the rest riding on a
  jackpot you will almost certainly not win.
</p>

<h2>So which game is "better"?</h2>
<p>There is no answer that survives contact with the arithmetic, but there are trade-offs:</p>
<ul>
  <li>
    <b>Cheapest shot at a jackpot:</b> Powerball, at ${pb.config.ticketPrice} per play against
    ${mm.config.ticketPrice}. Per dollar spent, Powerball buys more jackpot probability.
  </li>
  <li>
    <b>Best jackpot odds per play:</b> Mega Millions, by ${pct(harder, 1)}.
  </li>
  <li>
    <b>Most chances per week:</b> Powerball, with ${pb.config.drawDays.length} drawings
    (${pb.config.drawDaysLabel.toLowerCase()}) against ${mm.config.drawDays.length}.
  </li>
  <li>
    <b>Biggest small prizes:</b> Mega Millions, because the multiplier is included. Its
    ${mm.table.rows[2].match} tier pays a base ${mm.table.rows[2].prize} and never less than
    double that.
  </li>
</ul>
${callout(
  "The honest summary",
  `<p>At ${oneIn(mm.config.jackpotOdds)} and ${oneIn(pb.config.jackpotOdds)}, the two jackpots
  are equally out of reach for any practical purpose. Choose on ticket price, drawing nights
  and which prize structure you find more fun — not on a probability edge that does not exist
  in any meaningful sense.</p>`,
)}

<h2>Check the numbers yourself</h2>
<p>
  Every figure on this page comes from two inputs: the published ball matrices and the
  published base prizes. The odds for a tier are
</p>
<p class="formula">
  P(match m white, bonus hit or missed) =
  [ C(5,&nbsp;m) × C(N−5,&nbsp;5−m) / C(N,&nbsp;5) ] × [ 1/B or (B−1)/B ]
</p>
<p>
  where N is the white-ball pool and B the bonus pool. Our
  <a href="how-lottery-odds-are-calculated.html">step-by-step guide to calculating lottery
  odds</a> works through the formula from scratch, and the totals above match the official
  prize charts published by both games to the penny.
</p>`;
  },
};

/* ---------------------------------- 2 ------------------------------------- */

const independentTrials = {
  slug: "independent-trials",
  kicker: "Probability",
  title: "The law of independent trials: why past numbers can't predict the next drawing",
  dek: "A ball that has not appeared in 40 drawings is not \"due\". Here is what independence actually means, and what the full drawing record says when you test it properly.",
  description:
    "What statistical independence means for lottery drawings, why 'due' numbers and the gambler's fallacy are wrong, and a chi-square test of the complete Mega Millions and Powerball drawing record.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const total = mm.history.count + pb.history.count;

    return `
<p class="lede">
  Almost every lottery strategy ever sold rests on one assumption: that the past drawings tell
  you something about the next one. They do not. This is not an opinion about lotteries — it
  is a property of how the drawings are constructed, and it is measurable.
</p>

<h2>What "independent" means</h2>
<p>
  Two events are independent when knowing the outcome of one tells you nothing about the
  probability of the other. Formally, P(A&nbsp;|&nbsp;B) = P(A). A lottery drawing is the
  textbook example: the machine is loaded with a full set of balls every time, the balls are
  weighed and tested, and nothing about last Friday's result changes tonight's physical setup.
</p>
<p>
  The consequence is uncomfortable but simple. Before tonight's Powerball drawing, each of the
  ${num(pb.config.jackpotOdds)} possible tickets has probability
  1/${num(pb.config.jackpotOdds)}. The ticket 1-2-3-4-5 with ${pb.config.specialAbbr}&nbsp;6 has
  exactly that probability. So does the combination that won last week. So does the set our own
  generator just produced. A weighting scheme can change <em>which</em> equally-likely ticket
  you end up holding; it cannot change the "equally likely" part.
</p>

${callout(
  "The gambler's fallacy, in one sentence",
  `<p>Balls have no memory, no sense of fairness and no obligation to even out. The belief that
  a long-absent number is "due" — or that a frequent number is "on a run" — is the single most
  common statistical error in gambling, and it survives because humans are very bad at
  recognising what randomness looks like.</p>`,
)}

<h2>Testing it on the full drawing record</h2>
<p>
  If some numbers really were favoured, the counts would not fit a uniform distribution. That
  is exactly what a chi-square goodness-of-fit test measures. Below, every drawing since each
  game's current ball matrix began — ${num(total)} drawings in total — is tested against the
  hypothesis that every ball is equally likely.
</p>
${table(
  ["", mm.config.name, pb.config.name],
  [
    ["Drawings tested", num(mm.history.count), num(pb.history.count)],
    ["White balls", `1–${mm.config.mainMax}`, `1–${pb.config.mainMax}`],
    [
      "Expected appearances per ball",
      mm.expectedPerBall.toFixed(1),
      pb.expectedPerBall.toFixed(1),
    ],
    ["Chi-square statistic", mm.chi.chi.toFixed(1), pb.chi.chi.toFixed(1)],
    ["Degrees of freedom", String(mm.chi.df), String(pb.chi.df)],
    ["p-value", mm.chi.p.toFixed(2), pb.chi.p.toFixed(2)],
  ],
  { className: "table--compare" },
)}
<p>
  Under a fair game the chi-square statistic should land near its degrees of freedom
  (${mm.chi.df} and ${pb.chi.df} respectively), and it does. The p-values —
  ${mm.chi.p.toFixed(2)} and ${pb.chi.p.toFixed(2)} — are the probability of seeing a spread of
  counts at least this uneven purely by chance. Neither is anywhere near the conventional 0.05
  threshold. There is no statistical evidence of bias in either game.
</p>

<h2>But some numbers <em>have</em> come up far more often</h2>
<p>
  They have, and that is the point. In ${num(pb.history.count)} Powerball drawings, ball
  ${pb.mostDrawn[0].n} has appeared ${pb.mostDrawn[0].count} times while ball
  ${pb.leastDrawn[0].n} has appeared only ${pb.leastDrawn[0].count} times. A gap of
  ${pb.mostDrawn[0].count - pb.leastDrawn[0].count} appearances looks like a signal. It is not.
</p>
<p>
  To show why, we simulated ${num(pb.simulated.rounds)} alternative histories of the same
  length using a uniform random generator — a game guaranteed to be fair — and recorded how
  extreme the most- and least-drawn balls were each time.
</p>
${table(
  ["", "Real record", "Fair simulation (average)"],
  [
    [
      `${mm.config.name}: most-drawn ball`,
      `${mm.mostDrawn[0].count} (ball ${mm.mostDrawn[0].n})`,
      mm.simulated.maxMean.toFixed(1),
    ],
    [
      `${mm.config.name}: least-drawn ball`,
      `${mm.leastDrawn[0].count} (ball ${mm.leastDrawn[0].n})`,
      mm.simulated.minMean.toFixed(1),
    ],
    [
      `${mm.config.name}: hottest-to-coldest gap`,
      String(mm.mostDrawn[0].count - mm.leastDrawn[0].count),
      mm.simulated.spreadMean.toFixed(1),
    ],
    [
      `${pb.config.name}: most-drawn ball`,
      `${pb.mostDrawn[0].count} (ball ${pb.mostDrawn[0].n})`,
      pb.simulated.maxMean.toFixed(1),
    ],
    [
      `${pb.config.name}: least-drawn ball`,
      `${pb.leastDrawn[0].count} (ball ${pb.leastDrawn[0].n})`,
      pb.simulated.minMean.toFixed(1),
    ],
    [
      `${pb.config.name}: hottest-to-coldest gap`,
      String(pb.mostDrawn[0].count - pb.leastDrawn[0].count),
      pb.simulated.spreadMean.toFixed(1),
    ],
  ],
)}
<p>
  The real "hot" and "cold" extremes sit essentially on top of what a provably fair machine
  produces. Spread of that size is not evidence of bias; it is the expected consequence of
  distributing a few thousand appearances across seventy independent slots. If the counts came
  out perfectly level, <em>that</em> would be the anomaly worth investigating.
</p>

${adSlot("guide-mid")}

<h2>Three things people expect to see, and what actually happens</h2>
<h3>1. "A number is due after a long absence"</h3>
<p>
  The longest current dry spell in ${mm.config.name} belongs to ball ${mm.longestDry.n}, last
  seen ${num(mm.longestDry.gap)} drawings ago. Its probability of appearing tonight is
  5/${mm.config.mainMax} — identical to every other ball, and identical to what it was the day
  after it last appeared. Dry spells of that length are ordinary: with
  ${mm.config.mainMax} balls and 5 drawn per game, the average wait between appearances is
  ${(mm.config.mainMax / mm.config.pick).toFixed(0)} drawings, and waits several times longer
  than average are routine in any memoryless process.
</p>
<h3>2. "Numbers from the last drawing won't repeat"</h3>
<p>
  In ${num(mm.shape.total)} ${mm.config.name} drawings, ${pct(mm.shape.repeatRate)} contained at
  least one ball from the immediately preceding drawing; for ${pb.config.name} it is
  ${pct(pb.shape.repeatRate)}. Repeats are not rare — they are the norm in roughly a third of
  drawings, exactly as independence predicts.
</p>
<h3>3. "Consecutive numbers never come up"</h3>
<p>
  ${pct(mm.shape.consecutiveRate)} of ${mm.config.name} drawings and
  ${pct(pb.shape.consecutiveRate)} of ${pb.config.name} drawings contain at least one pair of
  consecutive numbers. Avoiding them on purpose removes about a quarter of the real winning
  patterns from your ticket for no reason at all.
</p>

<h2>The one thing your choice does affect</h2>
<p>
  Independence kills prediction, but it does not make every ticket equally <em>valuable</em>.
  If you win a jackpot, you split it with everyone else holding the same combination — and
  human number choices are extremely predictable. Dates, sequences and patterns on the play
  slip are picked far more often than the pool would suggest. Choosing unpopular combinations
  cannot improve your chance of winning, but it can improve what you keep if you do.
  That is the only defensible edge in number selection, and it is about
  <a href="what-winning-combinations-look-like.html">how other players pick, not how the balls
  fall</a>.
</p>

${callout(
  "What our generator is for",
  `<p>This site weights numbers by frequency, dry spells, momentum and pair history because
  those statistics are interesting and because the resulting lines look like real winning
  combinations. That is a presentation choice, not a prediction. Set every slider to zero and
  you get uniform randomness; the odds are identical either way, and we would rather say so
  plainly than sell you a system.</p>`,
  "warn",
)}`;
  },
};

/* ---------------------------------- 3 ------------------------------------- */

const recordJackpots = {
  slug: "record-jackpots-and-taxes",
  kicker: "Money",
  title: "Record jackpots and the tax math winners actually face",
  dek: "The advertised jackpot, the cash value and the amount that reaches a bank account are three very different numbers. Here is the gap, with the record board that produced them.",
  description:
    "The largest Mega Millions and Powerball jackpots on record, plus how annuity versus lump sum, 24% federal withholding, the 37% top bracket and state taxes reduce an advertised jackpot.",
  published: "2026-08-24",
  body(ctx) {
    const records = ctx.records;
    const top = records[0];
    const cashShare = top.cash / (top.annuity * 1000);

    return `
<p class="lede">
  A billion-dollar jackpot is not a billion-dollar cheque. Between the number on the roadside
  sign and the money a winner can spend sit two large deductions — the discount for taking cash
  instead of a 30-year annuity, and income tax at the top federal rate. Together they usually
  remove more than half.
</p>

<h2>The record board</h2>
<p>
  Advertised amounts are annuity values; the cash column is what the same prize pays as a
  single immediate payment, before any tax. Every one of these was won under the current ball
  matrices, and the first ever ten-figure jackpot arrived only in 2016.
</p>
${table(
  ["#", "Game", "Advertised", "Cash value", "Date", "Where", "Tickets"],
  records.map((r) => [
    String(r.rank),
    r.game,
    `<b>$${r.annuity.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}B</b>`,
    `$${num(r.cash, 1)}M`,
    r.date,
    r.where,
    r.tickets === 1 ? "1" : `<b>${r.tickets}</b> (split)`,
  ]),
  {
    caption:
      "Largest US lottery jackpots on record. Amounts are the advertised annuity and the announced cash option; a split jackpot divides both.",
  },
)}
<p>
  Two details in that table matter more than the headline figures. First, three of the biggest
  prizes were shared — the ${records[5].date} Powerball jackpot was split
  ${records[5].tickets} ways, turning $${records[5].annuity.toFixed(3)}&nbsp;billion into
  $${num(records[5].cash / records[5].tickets, 1)}&nbsp;million of cash each. Second, the cash
  value is consistently around ${pct(cashShare, 0)} of the advertised annuity, because the
  annuity is 30 graduated payments and the lottery only holds the present value of that stream.
</p>

<h2>Annuity or lump sum?</h2>
<p>
  Both Mega Millions and Powerball offer the same two choices, and roughly nine out of ten
  winners take the cash.
</p>
<ul>
  <li>
    <b>Annuity:</b> 30 payments over 29 years, each one 5% larger than the last. You receive
    the full advertised amount, spread across three decades, and each payment is taxed in the
    year it arrives.
  </li>
  <li>
    <b>Lump sum:</b> the cash value — historically about ${pct(cashShare, 0)} of the advertised
    figure, though the exact ratio moves with interest rates. All of it is taxable income in a
    single year.
  </li>
</ul>
<p>
  Neither is universally better. The annuity is protection against yourself: it cannot be lost
  to a bad investment, a lawsuit or a relative with a business idea. The lump sum wins on
  arithmetic if you can reliably earn more than the discount rate baked into the annuity, and
  it gives you control of the estate planning.
</p>

<h2>The tax arithmetic</h2>
<p>
  US lottery prizes are ordinary income, not capital gains. Three layers apply, and the first
  one is routinely mistaken for the whole bill.
</p>
${table(
  ["Layer", "Rate", "What it means"],
  [
    [
      "Federal withholding",
      "24%",
      "Withheld automatically on prizes above $5,000. It is a prepayment, not a final tax.",
    ],
    [
      "Federal top bracket",
      "37%",
      "For 2026 the top rate starts at $640,600 of taxable income for a single filer and $768,700 for a married couple filing jointly. A jackpot clears that in its first fraction of a percent, so effectively the whole prize is taxed at 37% — leaving about 13 points still owed at filing.",
    ],
    [
      "State income tax",
      "0% – ~10.9%",
      "Florida, Texas, Washington, Tennessee, South Dakota, Wyoming, New Hampshire and Alaska levy nothing; California exempts its own lottery prizes by statute. New York is the heaviest at up to 10.9%, plus a New York City local tax.",
    ],
  ],
)}
${callout(
  "The 24% trap",
  `<p>A winner who sees 24% withheld and assumes the tax is settled is in for a bill the
  following April. On a $500&nbsp;million cash option, the missing 13 percentage points are
  about $65&nbsp;million. Every large-prize checklist starts with the same two items: say
  nothing publicly, and hire a tax professional before you claim.</p>`,
  "warn",
)}

<h2>A worked example: the $${top.annuity} billion ticket</h2>
<p>
  The ${top.date} Powerball jackpot — ${top.where}, a single ticket — is the largest lottery
  prize ever awarded. Follow the money:
</p>
${table(
  ["Step", "Amount"],
  [
    ["Advertised annuity jackpot", `$${top.annuity.toFixed(2)} billion`],
    ["Cash option taken by the winner", `$${num(top.cash, 1)} million`],
    [
      "Federal withholding at 24%",
      `−$${num((top.cash * 0.24) | 0, 1)} million`,
    ],
    [
      "Additional federal tax due at filing (to 37%)",
      `−$${num((top.cash * 0.13) | 0, 1)} million`,
    ],
    ["State tax (California exempts its own lottery)", "$0"],
    [
      "Approximate net",
      `<b>$${num((top.cash * 0.63) | 0, 1)} million</b>`,
    ],
  ],
)}
<p>
  Roughly ${pct(0.63 * cashShare, 0)} of the advertised jackpot survives — and that is the
  <em>best</em> case, in a state that does not tax the prize, with no split. A winner in New
  York would keep closer to half of the cash value.
</p>

${adSlot("guide-mid")}

<h2>Why the records are all recent</h2>
<p>
  Every jackpot on the board above was won in 2016 or later, and that is not a coincidence. Both
  games deliberately made their jackpots harder to hit — Powerball in October 2015, Mega Millions
  in 2013 and 2017 — which lengthens the roll and pushes the advertised top prize higher before
  somebody finally wins. (Mega Millions changed course in 2025, improving the jackpot odds
  slightly while raising the ticket price to $5 and enlarging every lower prize.)
  <a href="powerball-2015-rule-change.html">The 2015 Powerball change is the clearest case</a>:
  the first billion-dollar jackpot in history arrived roughly three months after it took effect.
</p>

<h2>Practical notes for a large win</h2>
<ul>
  <li>
    <b>Deadlines are real.</b> Claim periods run from 90 days to a year depending on the
    jurisdiction, and unclaimed jackpots do expire.
  </li>
  <li>
    <b>Anonymity varies.</b> A minority of states allow anonymous claims; several others permit
    claiming through a trust or LLC, which is why the record board lists entities rather than
    names in some rows.
  </li>
  <li>
    <b>Non-US winners</b> generally face 30% federal withholding instead of 24%, plus whatever
    their home country's treaty specifies.
  </li>
  <li>
    <b>Small prizes are taxable too.</b> There is no minimum below which winnings stop being
    income; the $5,000 figure is only the withholding threshold.
  </li>
</ul>
<p class="note">
  This page explains published rules; it is not tax advice, and rates and thresholds change
  every year. Confirm anything that matters with a qualified professional and with your state
  lottery.
</p>`;
  },
};

/* ---------------------------------- 4 ------------------------------------- */

const ruleChange2015 = {
  slug: "powerball-2015-rule-change",
  kicker: "History",
  title: "How the 2015 Powerball rule change reshaped the odds",
  dek: "Ten white balls added, nine red balls removed. The jackpot became two-thirds harder to win, small prizes became easier, and the first billion-dollar jackpot followed within months.",
  description:
    "An analysis of Powerball's October 2015 matrix change from 5/59+1/35 to 5/69+1/26: the exact odds before and after, the effect on rollovers, and why it created the billion-dollar jackpot era.",
  published: "2026-08-24",
  body(ctx) {
    const pc = ctx.powerballChange;
    const pb = ctx.pb;
    const mm2025 = ctx.megaMillions2025;

    return `
<p class="lede">
  On 4 October 2015 Powerball changed the contents of its two ball machines. The white-ball pool
  grew from 59 to 69; the red Powerball pool shrank from 35 to 26. The first drawing under the
  new rules was ${dateLong(pb.config.matrixSince)}, and the game has not changed since. It is the
  single most consequential rule change in the history of American lotteries.
</p>

<h2>Before and after, exactly</h2>
${table(
  ["", `Before (${pc.before.matrix})`, `After (${pc.after.matrix})`],
  [
    ["Jackpot odds", oneIn(pc.before.jackpot), oneIn(pc.after.jackpot)],
    ["Odds of any prize", oneIn(pc.before.anyPrizeOneIn), oneIn(pc.after.anyPrizeOneIn)],
    ["Match 5 (second prize)", oneIn(pc.before.matchFive), oneIn(pc.after.matchFive)],
    ["Match 4 + Powerball", oneIn(pc.before.fourPlusOne), oneIn(pc.after.fourPlusOne)],
    ["Match 4 + Powerball prize", "$10,000", "$50,000"],
  ],
  { className: "table--compare" },
)}
<p>
  Two movements in opposite directions, both intentional. Adding white balls made the jackpot
  <b>${pct(pc.jackpotHarder)} harder</b> to win. Removing red balls made the bottom tiers — where
  you only need the Powerball itself — substantially easier, which improved the overall chance of
  winning something by <b>${pct(pc.anyPrizeBetter)}</b>, from
  ${oneIn(pc.before.anyPrizeOneIn)} to ${oneIn(pc.after.anyPrizeOneIn)}.
</p>
<p>
  The cost fell on the middle of the prize table. Matching all five white balls without the
  Powerball — the $1&nbsp;million tier — became <b>${pc.matchFiveRarer.toFixed(2)}× rarer</b>,
  from ${oneIn(pc.before.matchFive)} to ${oneIn(pc.after.matchFive)}. As partial compensation,
  the match-4-plus-Powerball prize was raised from $10,000 to $50,000.
</p>

${callout(
  "Why a lottery would make its jackpot harder",
  `<p>Jackpot size drives ticket sales far more powerfully than the probability of winning does.
  A harder jackpot rolls over more often, so the advertised prize climbs higher, which sells
  more tickets per drawing, which grows the prize faster still. Making the top prize less
  attainable and the small prizes more attainable is a deliberate design: it manufactures
  headline jackpots while keeping casual players entertained.</p>`,
)}

<h2>The rollover arithmetic</h2>
<p>
  The mechanism is easiest to see through the probability that <em>nobody</em> wins a given
  drawing. If T tickets are sold and each has jackpot probability p, that chance is
  (1&nbsp;−&nbsp;p)<sup>T</sup>. Here is the same ticket volume under both matrices:
</p>
${table(
  ["Tickets sold in a drawing", "No jackpot winner (old matrix)", "No jackpot winner (new matrix)"],
  pc.rollover.map((r) => [
    `${num(r.tickets / 1e6)} million`,
    pct(r.before),
    `<b>${pct(r.after)}</b>`,
  ]),
)}
<p>
  At a busy 160&nbsp;million tickets, the old game had a ${pct(pc.rollover[3].before)} chance of
  rolling over; the new game has ${pct(pc.rollover[3].after)}. Compounded over consecutive
  drawings, that difference is the whole story: rolls last longer, so advertised jackpots reach
  altitudes that were previously almost unreachable.
</p>

<h2>What happened next</h2>
<p>
  The evidence arrived quickly. On 13 January 2016 — barely three months
  after the change — Powerball paid
  $${ctx.records[5].annuity.toFixed(3)}&nbsp;billion split between three tickets in
  ${ctx.records[5].where}. It was the first lottery jackpot anywhere to pass $1&nbsp;billion.
  Before October 2015, no US jackpot had ever exceeded $700&nbsp;million; since then, more than
  a dozen have passed a billion, and Powerball holds the four largest prizes ever awarded.
</p>
<p>
  Mega Millions read the same playbook. Its 2017 revamp took the white balls to 70 and pushed
  jackpot odds to ${oneIn(mm2025.before.jackpot)}, and the April 2025 change moved in the other
  direction for once — removing a single Mega Ball to improve jackpot odds to
  ${oneIn(mm2025.after.jackpot)} and overall odds from ${oneIn(mm2025.before.anyPrizeOneIn)} to
  ${oneIn(mm2025.after.anyPrizeOneIn)} — while raising the ticket price to $5 and building a
  2X–10X multiplier into every play.
</p>

${adSlot("guide-mid")}

<h2>Why we only analyse drawings after a matrix change</h2>
<p>
  A rule change also breaks the drawing record in a way that matters for anyone doing
  statistics. Before October 2015, balls 60 to 69 did not exist in Powerball; a raw
  all-time frequency table therefore shows them as ice cold, for the simple reason that they
  were not in the machine. The same trap exists in Mega Millions, where the white-ball pool has
  been 50, 52, 56, 75 and now 70 balls at different times.
</p>
<p>
  That is why every statistic on this site starts at the first drawing of the current matrix —
  ${dateLong(pb.config.matrixSince)} for Powerball and
  ${dateLong(ctx.mm.config.matrixSince)} for Mega Millions — giving
  ${num(pb.history.count)} and ${num(ctx.mm.history.count)} comparable drawings respectively.
  Mixing eras is the most common error in published lottery statistics, and it produces
  confident nonsense about "cold" numbers.
</p>

<h2>The part that did not change</h2>
<p>
  Rule changes alter the odds. They do not alter the independence of drawings: the new matrix is
  reloaded from scratch every time, exactly like the old one.
  <a href="independent-trials.html">A ball's history still tells you nothing about tonight</a> —
  it just tells you which era's rules were in force when it was drawn.
</p>`;
  },
};

/* ---------------------------------- 5 ------------------------------------- */

const expectedValue = {
  slug: "expected-value-of-a-lottery-ticket",
  kicker: "Analysis",
  title: "When is a lottery ticket \"worth\" it? The expected-value math",
  dek: "There is a jackpot size at which a ticket's expected value passes its price. It is much higher than most people assume, and reaching it still does not make the bet a good one.",
  description:
    "How to compute the expected value of a Mega Millions or Powerball ticket, the jackpot size needed to break even after cash discount and taxes, and why positive expected value still isn't a good bet.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;

    return `
<p class="lede">
  Expected value is the average result of a bet repeated forever: each outcome's value
  multiplied by its probability, all added together. For a lottery ticket it is the cleanest way
  to see what you are buying — and the calculation has a genuinely surprising middle section.
</p>

<h2>Step 1: the fixed prizes</h2>
<p>
  Everything below the jackpot is a known amount at known odds, so it can be summed directly.
</p>
${table(
  ["Match", "Prize", "Probability", "Contribution to EV"],
  pb.table.rows
    .filter((r) => r.value)
    .map((r) => [
      r.match,
      money(r.value),
      oneIn(r.oneIn),
      `$${(r.value * r.probability).toFixed(4)}`,
    ])
    .concat([
      [
        "<b>Total fixed prizes</b>",
        "",
        "",
        `<b>$${pb.breakEvenBase.fixedEv.toFixed(4)}</b>`,
      ],
    ]),
  { caption: `Powerball, ${pb.config.matrixLabel}, ${pb.config.ticketPrice} per play.` },
)}
<p>
  A ${pb.config.ticketPrice} Powerball ticket therefore returns
  $${pb.breakEvenBase.fixedEv.toFixed(2)} — ${pct(pb.breakEvenBase.fixedReturn)} of its price —
  from the fixed tiers alone. The equivalent figure for a ${mm.config.ticketPrice} Mega Millions
  play is $${mm.breakEvenBase.fixedEv.toFixed(2)}, or ${pct(mm.breakEvenBase.fixedReturn)},
  before its built-in 2X–10X multiplier is applied. Roughly a fifth of your money, in other
  words, is buying small prizes; the rest is buying jackpot probability.
</p>

<h2>Step 2: the naive break-even jackpot</h2>
<p>
  For the whole ticket to break even, the jackpot term has to cover the remaining
  ${pb.config.ticketPrice} − $${pb.breakEvenBase.fixedEv.toFixed(2)} =
  $${(pb.breakEvenBase.price - pb.breakEvenBase.fixedEv).toFixed(2)}. Divide by the jackpot
  probability and you get the required prize:
</p>
<p class="formula">
  Break-even jackpot = (ticket price − fixed EV) × ${num(pb.config.jackpotOdds)} ≈
  <b>$${(pb.breakEvenBase.naive / 1e6).toFixed(0)} million</b>
</p>
<p>
  That is the number people usually stop at, and on its own it makes billion-dollar jackpots look
  like a bargain. It is also wrong, because it treats the advertised jackpot as money received.
</p>

<h2>Step 3: what the jackpot is actually worth</h2>
<p>
  The advertised figure is an annuity spread over 29 years. Take the cash instead and you get
  roughly half. Then the entire amount is taxed as ordinary income at the top federal rate.
</p>
${table(
  ["Adjustment", "Multiplier", "Running value of an advertised $1 billion"],
  [
    ["Advertised annuity", "1.00", "$1,000 million"],
    ["Cash option (≈50%)", "0.50", "$500 million"],
    ["Federal tax at 37%", "0.63", "$315 million"],
    ["<b>Kept, best case</b>", `<b>${pb.breakEven.realisedShare.toFixed(2)}</b>`, "<b>$315 million</b>"],
  ],
)}
<p>
  Only about ${pct(pb.breakEven.realisedShare, 0)} of the advertised prize reaches the winner in
  a no-state-tax jurisdiction, so the break-even jackpot has to be scaled up by the inverse of
  that fraction:
</p>
${table(
  ["Game", "Naive break-even", "After cash discount and 37% federal tax"],
  [
    [
      pb.config.name,
      `$${(pb.breakEvenBase.naive / 1e6).toFixed(0)} million`,
      `<b>$${(pb.breakEvenBase.afterCashAndTax / 1e9).toFixed(2)} billion</b>`,
    ],
    [
      mm.config.name,
      `$${(mm.breakEven.naive / 1e9).toFixed(2)} billion`,
      `<b>$${(mm.breakEven.afterCashAndTax / 1e9).toFixed(2)} billion</b>`,
    ],
  ],
  {
    caption:
      "Mega Millions figures include an allowance for the built-in multiplier on non-jackpot prizes; both ignore prize sharing.",
  },
)}
<p>
  Powerball has reached that territory a handful of times in its history. Mega Millions, at $5 a
  play, essentially never has.
</p>

${adSlot("guide-mid")}

<h2>Step 4: the killer — sharing</h2>
<p>
  The calculation above assumes you would be the only winner. At exactly the jackpot levels where
  expected value looks attractive, that assumption collapses: enormous jackpots sell enormous
  numbers of tickets, and the chance that somebody else holds your combination rises with every
  one of them.
</p>
<p>
  The record board is blunt about it. The ${ctx.records[5].date} Powerball jackpot, the first
  over a billion dollars, was split <b>${ctx.records[5].tickets} ways</b>. The
  ${ctx.records[2].date} jackpot of $${ctx.records[2].annuity.toFixed(3)}&nbsp;billion was split
  <b>${ctx.records[2].tickets} ways</b>. Sharing does not reduce the jackpot term a little; it
  halves or thirds it, and it does so precisely when the prize is large enough to have tempted
  you in.
</p>
${callout(
  "The practical conclusion",
  `<p>Once the cash discount, income tax and sharing risk are all included, there is no
  realistic advertised jackpot at which a Mega Millions or Powerball ticket is a
  positive-expectation purchase. The jackpot chases the break-even point but effectively never
  catches it.</p>`,
)}

<h2>Why positive expected value still wouldn't make it a good bet</h2>
<p>
  Suppose the arithmetic did tip over. A ticket would still be a terrible financial instrument,
  for reasons that have nothing to do with the mean:
</p>
<ul>
  <li>
    <b>The variance is absurd.</b> The expected value is carried almost entirely by an outcome
    with probability 1/${num(pb.config.jackpotOdds)}. You would need to buy tickets for far
    longer than the age of the universe for the average to have any predictive power over your
    own results.
  </li>
  <li>
    <b>Money is not linear.</b> Losing $2 a week for decades costs real utility; the millionth
    dollar of a jackpot adds far less happiness than the first. Under any concave utility
    function the bet gets worse, not better.
  </li>
  <li>
    <b>You cannot scale into it.</b> Buying every combination would cost hundreds of millions of
    dollars, take longer than the sales window allows, and still expose you to sharing.
  </li>
</ul>

<h2>The historical exceptions</h2>
<p>
  Beatable lotteries have existed, and none of them were jackpot games. In 1992 a syndicate
  bought a large share of all possible combinations in the Virginia state lottery when a rolled
  jackpot made the maths favourable. Between 2005 and 2012, groups in Massachusetts exploited
  Cash WinFall, a game whose jackpot "rolled down" into the lower tiers when it was not won,
  briefly giving high-volume buyers a genuine edge. Both loopholes were structural design flaws
  in small games with cheap coverage, and both were closed. Neither has an analogue in a
  ${oneIn(pb.config.jackpotOdds)} national jackpot.
</p>
<p class="note">
  Treat a ticket as an entertainment purchase with a known price and a known, tiny payoff
  probability. That framing is honest and it never leads anywhere expensive.
  <a href="../responsible-play.html">Our responsible play page</a> has the warning signs worth
  knowing.
</p>`;
  },
};

/* ---------------------------------- 6 ------------------------------------- */

const winningShapes = {
  slug: "what-winning-combinations-look-like",
  kicker: "Data",
  title: "What real winning combinations look like: sums, splits and consecutive numbers",
  dek: "Winning tickets are not evenly spread across the play slip. The pattern is entirely a consequence of counting — and it matters for one reason only, which is not the one usually claimed.",
  description:
    "The measured shape of real Mega Millions and Powerball winning combinations: sum distribution, odd/even and low/high splits, decade spread, consecutive pairs and the 1-31 birthday bias.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const mmHalf = Math.floor(mm.config.mainMax / 2);
    const pbHalf = Math.floor(pb.config.mainMax / 2);

    const splitRow = (label, dist, pick) =>
      [label].concat(dist.map((v) => pct(v)));

    return `
<p class="lede">
  Take every drawing since each game's current matrix began and measure the same five things
  about each one, and a very consistent portrait appears. None of it makes a combination more
  likely to be drawn. All of it explains why a random-looking ticket and a real winning ticket
  often look like different species.
</p>

<h2>The sum of the five white balls</h2>
<p>
  The lowest possible Mega Millions sum is 1+2+3+4+5 = 15 and the highest is
  ${mm.config.mainMax - 4}+${mm.config.mainMax - 3}+${mm.config.mainMax - 2}+${mm.config.mainMax - 1}+${mm.config.mainMax} =
  ${5 * mm.config.mainMax - 10}. In practice, sums pile up in the middle.
</p>
${table(
  ["", mm.config.name, pb.config.name],
  [
    ["Drawings measured", num(mm.shape.total), num(pb.shape.total)],
    ["Average sum", mm.shape.sumMean.toFixed(1), pb.shape.sumMean.toFixed(1)],
    ["Standard deviation", mm.shape.sumSd.toFixed(1), pb.shape.sumSd.toFixed(1)],
    [
      "Middle 80% of drawings",
      `${Math.round(mm.shape.sumQ10)} – ${Math.round(mm.shape.sumQ90)}`,
      `${Math.round(pb.shape.sumQ10)} – ${Math.round(pb.shape.sumQ90)}`,
    ],
    [
      "Lowest / highest observed",
      `${mm.shape.sumMin} / ${mm.shape.sumMax}`,
      `${pb.shape.sumMin} / ${pb.shape.sumMax}`,
    ],
  ],
  { className: "table--compare" },
)}
<p>
  There is nothing mystical here. There is exactly one way to make the minimum sum and exactly
  one way to make the maximum, but there are hundreds of thousands of ways to make a sum near
  the middle. Summing five draws from a flat range produces an approximately bell-shaped
  distribution — the central limit theorem doing its job on five samples. Every individual
  combination remains equally likely; the <em>sums</em> are not equally likely because they are
  not equally numerous.
</p>

<h2>Odd and even</h2>
<p>How often each odd/even split appears, out of five white balls:</p>
${table(
  ["Game", "0 odd", "1 odd", "2 odd", "3 odd", "4 odd", "5 odd"],
  [splitRow(mm.config.name, mm.shape.oddDist), splitRow(pb.config.name, pb.shape.oddDist)],
)}
<p>
  The two middle columns — three-two splits in either direction — account for
  ${pct(mm.shape.oddDist[2] + mm.shape.oddDist[3])} of Mega Millions drawings and
  ${pct(pb.shape.oddDist[2] + pb.shape.oddDist[3])} of Powerball drawings. All-odd or all-even
  tickets do come up: ${pct(mm.shape.oddDist[0] + mm.shape.oddDist[5])} of the time in Mega
  Millions. Rare, but a long way from impossible.
</p>

<h2>Low and high</h2>
<p>
  Splitting each pool in half — 1–${mmHalf} against ${mmHalf + 1}–${mm.config.mainMax} for Mega
  Millions, 1–${pbHalf} against ${pbHalf + 1}–${pb.config.mainMax} for Powerball:
</p>
${table(
  ["Game", "0 low", "1 low", "2 low", "3 low", "4 low", "5 low"],
  [splitRow(mm.config.name, mm.shape.lowDist), splitRow(pb.config.name, pb.shape.lowDist)],
)}
<p>
  All five balls from the bottom half happened in ${pct(mm.shape.allLowShare)} of Mega Millions
  drawings and ${pct(pb.shape.allLowShare)} of Powerball drawings; all five from the top half in
  ${pct(mm.shape.allHighShare)} and ${pct(pb.shape.allHighShare)}. These are the drawings that
  make people say "that can't be random" — and they arrive at almost exactly the rate
  combinatorics predicts.
</p>

<h2>Spread and consecutive numbers</h2>
${table(
  ["Measure", mm.config.name, pb.config.name],
  [
    [
      "Drawings with at least one consecutive pair",
      pct(mm.shape.consecutiveRate),
      pct(pb.shape.consecutiveRate),
    ],
    [
      "Drawings repeating a ball from the previous drawing",
      pct(mm.shape.repeatRate),
      pct(pb.shape.repeatRate),
    ],
    [
      "Balls landing in 4 or more different decades",
      pct(mm.shape.bucketDist.slice(4).reduce((a, b) => a + b, 0)),
      pct(pb.shape.bucketDist.slice(4).reduce((a, b) => a + b, 0)),
    ],
    [
      "Balls landing in 3 or fewer decades",
      pct(mm.shape.bucketDist.slice(0, 4).reduce((a, b) => a + b, 0)),
      pct(pb.shape.bucketDist.slice(0, 4).reduce((a, b) => a + b, 0)),
    ],
  ],
  { className: "table--compare" },
)}
<p>
  Roughly one drawing in four contains neighbouring numbers such as 34-35. Players avoid them
  instinctively, which means anyone who does play them is less likely to share a prize — the
  only sense in which the choice matters at all.
</p>

${adSlot("guide-mid")}

<h2>The birthday problem on a play slip</h2>
<p>
  The most predictable human bias is the calendar. Dates cannot exceed 31, so tickets built from
  birthdays and anniversaries never use the upper two-thirds of the pool. How often does a real
  drawing produce five balls that would fit on a calendar?
</p>
${table(
  ["Game", "Drawings", "All five balls ≤ 31", "Expected by chance", "Observed"],
  [
    [
      mm.config.name,
      num(mm.history.count),
      String(mm.shape.under31Share.observedCount),
      mm.shape.under31Share.expectedCount.toFixed(1),
      pct(mm.shape.under31Share.observed, 2),
    ],
    [
      pb.config.name,
      num(pb.history.count),
      String(pb.shape.under31Share.observedCount),
      pb.shape.under31Share.expectedCount.toFixed(1),
      pct(pb.shape.under31Share.observed, 2),
    ],
  ],
)}
<p>
  Powerball's count is essentially exact — ${pb.shape.under31Share.observedCount} against an
  expected ${pb.shape.under31Share.expectedCount.toFixed(1)}. Mega Millions has run a little
  hot, ${mm.shape.under31Share.observedCount} against
  ${mm.shape.under31Share.expectedCount.toFixed(1)} expected, which a Poisson test puts at a
  ${pct(mm.shape.under31Share.tail, 1)} probability of happening by chance. That sounds
  impressive until you remember how many patterns are being tested at once: run twenty
  independent checks on random data and one of them will clear the 5% bar by construction. This
  is the multiple-comparisons trap that generates most "lottery pattern" claims.
</p>
<p>
  The practical takeaway is not that calendar numbers are drawn less often — they are drawn
  exactly as often as anything else. It is that <b>far more players choose them</b>, so a
  calendar-only jackpot gets divided among more tickets. The famous illustration is the March
  1989 Irish National Lottery drawing, and closer to home, every heavily-shared US jackpot has
  featured combinations rich in low numbers.
</p>

<h2>What to do with all this</h2>
<p>
  Nothing about your chance of winning. Everything about what a win would be worth, and about
  recognising nonsense when you read it. The distributions above are what our
  <a href="../mega-millions.html">Mega Millions</a> and
  <a href="../powerball.html">Powerball</a> generators sample from when the "match historical
  shape" filter is on: instead of picking five numbers at random, they draw a real historical
  odd/even and low/high composition and fill it, so the lines they produce sit inside the
  distributions on this page rather than outside them.
</p>
${callout(
  "Say it once more",
  `<p>A statistically typical combination and a statistically unusual one have identical
  probabilities of being drawn. Shape filters make a ticket look like a winner; they cannot make
  it more likely to be one.
  <a href="independent-trials.html">Here is why, in detail</a>.</p>`,
  "warn",
)}`;
  },
};

/* ---------------------------------- 7 ------------------------------------- */

const hotCold = {
  slug: "hot-and-cold-numbers-tested",
  kicker: "Data",
  title: "Are hot and cold numbers real? Testing the full drawing record",
  dek: "Every lottery site publishes a hot-numbers table. We ran the two tests that decide whether those tables contain any information at all.",
  description:
    "A statistical test of hot and cold lottery numbers using every Mega Millions and Powerball drawing of the current matrices: chi-square goodness of fit, Monte Carlo extremes and window stability.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;

    return `
<p class="lede">
  "Hot" numbers are the ones drawn most often recently; "cold" numbers are the laggards. Both
  tables are easy to compute and impossible to resist. The question is whether the ranking
  carries any information about the next drawing — and that question has a definite answer.
</p>

<h2>The current tables</h2>
${table(
  ["Game", "Most drawn", "Least drawn", "Longest current dry spell"],
  [
    [
      mm.config.name,
      mm.mostDrawn.map((x) => `<b>${x.n}</b>&nbsp;(${x.count})`).join(", "),
      mm.leastDrawn.map((x) => `<b>${x.n}</b>&nbsp;(${x.count})`).join(", "),
      `ball <b>${mm.longestDry.n}</b>, ${num(mm.longestDry.gap)} drawings`,
    ],
    [
      pb.config.name,
      pb.mostDrawn.map((x) => `<b>${x.n}</b>&nbsp;(${x.count})`).join(", "),
      pb.leastDrawn.map((x) => `<b>${x.n}</b>&nbsp;(${x.count})`).join(", "),
      `ball <b>${pb.longestDry.n}</b>, ${num(pb.longestDry.gap)} drawings`,
    ],
  ],
  {
    caption: `Counts cover ${num(mm.history.count)} Mega Millions drawings since ${dateLong(mm.history.firstDraw)} and ${num(pb.history.count)} Powerball drawings since ${dateLong(pb.history.firstDraw)}.`,
  },
)}
<p>
  In Powerball the gap between the top and bottom of that table is
  ${pb.mostDrawn[0].count - pb.leastDrawn[0].count} appearances — ball ${pb.mostDrawn[0].n} has
  been drawn ${pb.mostDrawn[0].count} times and ball ${pb.leastDrawn[0].n} only
  ${pb.leastDrawn[0].count}. Presented as a bar chart it looks like a clear signal.
</p>

<h2>Test 1: does the whole distribution deviate from fair?</h2>
<p>
  The chi-square goodness-of-fit test compares all ${mm.config.mainMax} (or
  ${pb.config.mainMax}) observed counts against the counts a fair machine would produce, and
  reports the probability of seeing a deviation at least this large by chance.
</p>
${table(
  ["Game", "Expected per ball", "Chi-square", "df", "p-value", "Verdict"],
  [
    [
      mm.config.name,
      mm.expectedPerBall.toFixed(1),
      mm.chi.chi.toFixed(1),
      String(mm.chi.df),
      mm.chi.p.toFixed(2),
      mm.chi.p > 0.05 ? "consistent with a fair game" : "worth another look",
    ],
    [
      pb.config.name,
      pb.expectedPerBall.toFixed(1),
      pb.chi.chi.toFixed(1),
      String(pb.chi.df),
      pb.chi.p.toFixed(2),
      pb.chi.p > 0.05 ? "consistent with a fair game" : "worth another look",
    ],
  ],
)}
<p>
  A p-value of ${mm.chi.p.toFixed(2)} means that if the game is perfectly fair, you would see
  counts at least this uneven about ${pct(mm.chi.p, 0)} of the time. That is not evidence of
  anything. Both games pass comfortably.
</p>

<h2>Test 2: are the extremes more extreme than chance allows?</h2>
<p>
  A fair distribution still produces a most-drawn and a least-drawn ball — someone has to come
  first. So the right question is not "is there a hottest number" but "is the hottest number
  hotter than a fair game would produce". We generated
  ${num(pb.simulated.rounds)} synthetic histories per game with a uniform random generator and
  recorded the extremes.
</p>
${table(
  ["Statistic", "Real record", "Fair simulation", "Simulated 95th percentile"],
  [
    [
      `${mm.config.name}: highest ball count`,
      `${mm.mostDrawn[0].count}`,
      mm.simulated.maxMean.toFixed(1),
      String(mm.simulated.maxP95),
    ],
    [
      `${mm.config.name}: hottest-minus-coldest`,
      String(mm.mostDrawn[0].count - mm.leastDrawn[0].count),
      mm.simulated.spreadMean.toFixed(1),
      String(mm.simulated.spread95),
    ],
    [
      `${pb.config.name}: highest ball count`,
      `${pb.mostDrawn[0].count}`,
      pb.simulated.maxMean.toFixed(1),
      String(pb.simulated.maxP95),
    ],
    [
      `${pb.config.name}: hottest-minus-coldest`,
      String(pb.mostDrawn[0].count - pb.leastDrawn[0].count),
      pb.simulated.spreadMean.toFixed(1),
      String(pb.simulated.spread95),
    ],
  ],
)}
<p>
  The real extremes sit right on the simulated averages. Randomness is lumpy: spreading a few
  thousand appearances over seventy slots reliably produces a leader several appearances clear
  of the field, and a straggler equally far behind. The existence of a hot number is a
  mathematical certainty. Its identity is noise.
</p>

${adSlot("guide-mid")}

<h2>Test 3: does "hot" stay hot?</h2>
<p>
  Information that predicts the future is stable. Superstition is not. Shorten the analysis
  window on either of our generator pages — from the full matrix era to the last 400 or last 120
  drawings — and the hot list reshuffles almost completely, which is precisely what you expect
  from a table built on sampling noise. A ranking that changes every time you change the window
  is not measuring a property of the balls.
</p>

${callout(
  "Why the illusion is so durable",
  `<ul>
    <li><b>Small numbers look extreme.</b> With ${mm.expectedPerBall.toFixed(0)} expected
    appearances per ball, ordinary Poisson variation is ±${Math.round(Math.sqrt(mm.expectedPerBall))}
    or so — enough to create dramatic-looking charts.</li>
    <li><b>We test after looking.</b> Picking the most extreme ball out of seventy and then
    asking whether it is unusual is the Texas sharpshooter fallacy.</li>
    <li><b>Confirmation is cheap.</b> A hot number will appear again eventually — five in every
    ${mm.config.mainMax / mm.config.pick} drawings, in fact — and that hit is remembered while
    the misses are not.</li>
  </ul>`,
)}

<h2>So why does this site show hot and cold numbers?</h2>
<p>
  Because the statistics are genuinely interesting, because seeing them measured properly is the
  fastest cure for believing in them, and because weighting a random draw by frequency produces
  lines that look plausible without changing anyone's odds. Our generators let you set the
  frequency, dry-spell and momentum weights to zero, which gives exact uniform randomness, and
  we verify that with a chi-square test in our own test suite.
</p>
<p>
  If a site charges you for a hot-numbers system, the two tests above are the ones to ask them
  to run. <a href="independent-trials.html">The law of independent trials</a> explains why the
  answer cannot come out any other way.
</p>`;
  },
};

/* ---------------------------------- 8 ------------------------------------- */

const oddsMath = {
  slug: "how-lottery-odds-are-calculated",
  kicker: "Math primer",
  title: "How to calculate lottery odds yourself",
  dek: "Two formulas cover every jackpot game ever sold. Once you can reproduce the official prize chart, no lottery claim can surprise you again.",
  description:
    "A step-by-step guide to calculating lottery odds with combinations: the C(n,k) formula, jackpot odds, every prize tier, overall odds, and a reference table of every Mega Millions and Powerball matrix.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const whiteSets = mm.config.jackpotOdds / mm.config.specialMax;

    return `
<p class="lede">
  Lottery odds are not a secret and not an estimate. They are a counting exercise you can do on
  paper, and every figure a lottery publishes can be reproduced from the ball matrix alone. Here
  is the whole method, with the arithmetic shown.
</p>

<h2>Step 1: order does not matter</h2>
<p>
  A ticket matches whether or not the balls arrive in your order, so the count you need is
  combinations, not permutations. The number of ways to choose k items from n is
</p>
<p class="formula">C(n,&nbsp;k) = n! / [ k! × (n−k)! ]</p>
<p>
  For Mega Millions' five white balls from ${mm.config.mainMax}, the fraction is easier written
  out and cancelled:
</p>
<p class="formula">
  C(${mm.config.mainMax},&nbsp;5) =
  (${mm.config.mainMax} × ${mm.config.mainMax - 1} × ${mm.config.mainMax - 2} ×
  ${mm.config.mainMax - 3} × ${mm.config.mainMax - 4}) / (5 × 4 × 3 × 2 × 1) =
  <b>${num(whiteSets)}</b>
</p>
<p>
  Dividing by 5! is what removes the orderings: every set of five numbers can be arranged 120
  ways, and all 120 win the same prize.
</p>

<h2>Step 2: multiply by the second pool</h2>
<p>
  The bonus ball comes from a separate machine, so it is an independent choice and the counts
  multiply. This is the step people get wrong most often — the bonus ball is <em>not</em> one of
  the five, and it can duplicate one of them.
</p>
${table(
  ["Game", "White-ball sets", "×", "Bonus pool", "=", "Jackpot odds"],
  [
    [
      mm.config.name,
      num(whiteSets),
      "×",
      String(mm.config.specialMax),
      "=",
      `<b>${oneIn(mm.config.jackpotOdds)}</b>`,
    ],
    [
      pb.config.name,
      num(pb.config.jackpotOdds / pb.config.specialMax),
      "×",
      String(pb.config.specialMax),
      "=",
      `<b>${oneIn(pb.config.jackpotOdds)}</b>`,
    ],
  ],
)}

<h2>Step 3: the other prize tiers</h2>
<p>
  For a partial match you need to count two things at once: how many of your five numbers hit,
  and how many missed. If m of your five match, then m came from the 5 drawn balls and (5−m)
  came from the (N−5) balls that were not drawn:
</p>
<p class="formula">
  P(exactly m white) = C(5,&nbsp;m) × C(N−5,&nbsp;5−m) / C(N,&nbsp;5)
</p>
<p>Then multiply by 1/B if you also need the bonus ball, or (B−1)/B if you must miss it.</p>
<h3>Worked example: 4 white balls plus the Powerball</h3>
<p class="formula">
  C(5,&nbsp;4) × C(64,&nbsp;1) / C(69,&nbsp;5) × 1/26 =
  5 × 64 / ${num(pb.config.jackpotOdds / pb.config.specialMax)} × 1/26 =
  <b>${oneIn(pb.table.rows[2].oneIn)}</b>
</p>
<p>
  Powerball publishes 1 in 913,129.18 for that tier. The formula reproduces it exactly, and the
  same two lines of arithmetic generate every other row of the official chart.
</p>
${table(
  ["Match", "Formula", "Odds"],
  pb.table.rows.map((r) => [
    r.match,
    `C(5,&nbsp;${r.main}) × C(${pb.config.mainMax - pb.config.pick},&nbsp;${
      pb.config.pick - r.main
    }) / C(${pb.config.mainMax},&nbsp;5) × ${r.special ? "1/26" : "25/26"}`,
    oneIn(r.oneIn),
  ]),
  { caption: "Every Powerball tier, from the matrix alone." },
)}

<h2>Step 4: the overall odds</h2>
<p>
  "Odds of winning any prize" is just the sum of the winning tiers' probabilities, inverted.
  Adding the nine rows above gives ${oneIn(pb.table.anyPrizeOneIn)} for Powerball; the same sum
  for Mega Millions gives ${oneIn(mm.table.anyPrizeOneIn)}. Both match the official statements
  ("about 1 in 25" and "1 in 23") because they are the same calculation.
</p>

${adSlot("guide-mid")}

<h2>Four mistakes to avoid</h2>
<ul>
  <li>
    <b>Adding when you should multiply.</b> Independent stages multiply. The chance of matching
    five white balls <em>and</em> the bonus is the product of the two, not the sum.
  </li>
  <li>
    <b>Using permutations.</b> Forgetting to divide by 5! inflates the count by 120× and gives
    an "odds" figure in the tens of billions.
  </li>
  <li>
    <b>Treating "1 in 292 million" as a percentage.</b> It is 0.000000342%. Writing it as a
    percentage is a good way to feel the size of it.
  </li>
  <li>
    <b>Assuming odds accumulate.</b> Buying 10 tickets makes your chance 10 in 292,201,338, not
    1 in 29,220,134 for each of ten independent shots at the same prize — and playing every week
    for fifty years buys around 2,600 draws against a 292&nbsp;million denominator.
  </li>
</ul>

<h2>Reference: every matrix these two games have used</h2>
<p>
  Both lotteries have changed their ball pools repeatedly, and every change moved the jackpot
  odds. This is also why frequency statistics must never be mixed across eras.
</p>
${table(
  ["Effective", "Game", "Matrix", "Jackpot odds"],
  mm.matrix
    .map((era) => [era.from, mm.config.name, era.matrix, oneIn(era.odds)])
    .concat(pb.matrix.map((era) => [era.from, pb.config.name, era.matrix, oneIn(era.odds)]))
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map((row) => [dateLong(row[0]), row[1], row[2], row[3]]),
  { caption: "Jackpot odds computed from each published matrix." },
)}
<p>
  The trend is unmistakable: with two exceptions, every revision made the jackpot harder to win.
  <a href="powerball-2015-rule-change.html">The reasoning behind that is worth a page of its
  own</a>.
</p>

<h2>Now do it for your own state game</h2>
<p>
  The method is identical for any pick-5 or pick-6 game — swap N, k and B and turn the handle.
  If your result matches the odds on the back of the play slip, you have understood the game
  completely. If a website's numbers disagree with your arithmetic, trust the arithmetic.
</p>`;
  },
};

const megaMillions2025 = {
  slug: "mega-millions-2025-rule-change",
  kicker: "History",
  title: "What the 2025 Mega Millions overhaul actually changed",
  dek: "The ticket went from $2 to $5, the Mega Ball pool shrank by one, Megaplier disappeared, and every non-jackpot prize now carries a built-in 2X–10X multiplier. Here is the arithmetic.",
  description:
    "Analysis of Mega Millions' April 8, 2025 game change: $5 ticket, Mega Ball pool 25 to 24, jackpot odds 1 in 290,472,336, built-in multiplier, retired Megaplier, and what that did to overall odds.",
  published: "2026-08-24",
  body(ctx) {
    const mm = ctx.mm;
    const change = ctx.megaMillions2025;
    const jackpotEasier = 1 - change.after.jackpot / change.before.jackpot;
    const anyBetter = 1 - change.after.anyPrizeOneIn / change.before.anyPrizeOneIn;

    return `
<p class="lede">
  The last $2 Mega Millions drawing was Friday, 4 April 2025. Sales of the new $5 game began
  the next day, and the first drawing under the new rules was Tuesday,
  ${dateLong("2025-04-08")}. It was the first price increase since the 2017 matrix, and only
  the second in the game's history. The white balls stayed 1–70. Almost everything else moved.
</p>

<h2>The published changes, in one table</h2>
${table(
  ["", "Through 4 April 2025", "From 8 April 2025"],
  [
    ["Ticket price", "$2", "<b>$5</b>"],
    ["White balls", "5 of 70", "5 of 70"],
    ["Mega Ball pool", "1–25", "<b>1–24</b>"],
    ["Jackpot odds", oneIn(change.before.jackpot), oneIn(change.after.jackpot)],
    ["Odds of any prize", oneIn(change.before.anyPrizeOneIn), oneIn(change.after.anyPrizeOneIn)],
    ["Multiplier", "Optional $1 Megaplier", "<b>Built into every play (2X–10X)</b>"],
    ["Smallest possible win", "$2 (equal to the ticket)", "<b>$10 (always more than the ticket)</b>"],
    ["Match 5, no Mega Ball", "$1,000,000 (Megaplier could double it)", "$1,000,000 base, then 2X–10X"],
  ],
  { className: "table--compare" },
)}
<p>
  Removing one Mega Ball improved the jackpot odds by about
  <b>${pct(jackpotEasier, 1)}</b> — from ${oneIn(change.before.jackpot)} to
  ${oneIn(change.after.jackpot)}, which is the current official figure. Overall odds of winning
  any prize moved from ${oneIn(change.before.anyPrizeOneIn)} to
  ${oneIn(change.after.anyPrizeOneIn)}, a
  <b>${pct(anyBetter, 1)}</b> improvement. Those two numbers match the prize chart Mega Millions
  published for the new game.
</p>

<h2>Why they raised the price</h2>
<p>
  A $5 ticket is not five times as likely to win the jackpot as a $2 ticket. The jackpot
  probability improved only because the Mega Ball pool shrank by one. The extra three dollars
  buy something else: a random multiplier of 2X, 3X, 4X, 5X or 10X printed on every play, which
  applies to every prize except the jackpot. Megaplier, the old $1 add-on, was retired. So was
  the “Just the Jackpot” option that some states had offered.
</p>
<p>
  The design goal is visible in the bottom tier. Matching only the Mega Ball used to pay $2 —
  you got your ticket price back. Under the new rules that same match pays a $5 base prize
  times at least 2X, so the smallest win is $10. Official materials put it plainly: every
  winning ticket now pays more than it cost.
</p>

${callout(
  "What did not change",
  `<p>The five white balls are still drawn from 1–70, drawings are still Tuesdays and Fridays
  at 11:00 p.m. ET, and a drawing is still an independent event. A Mega Ball that came up often
  under the old 1–25 pool is not “hot” under the new 1–24 pool; the machine was reloaded with a
  different set of balls.</p>`,
)}

<h2>What this does to a ticket's expected value</h2>
<p>
  Before the multiplier, the fixed (non-jackpot) prizes on a $5 Mega Millions play return about
  $${mm.breakEvenBase.fixedEv.toFixed(2)} — ${pct(mm.breakEvenBase.fixedReturn)} of the ticket
  price. The built-in multiplier then scales every one of those prizes by at least 2X, which is
  why the game can advertise a higher return in the lower tiers even though the jackpot is
  still a 1-in-${num(mm.config.jackpotOdds)} event.
</p>
<p>
  The jackpot itself still has to cover most of the ticket. After converting the advertised
  annuity to cash (~50%) and applying the 37% top federal rate, a Mega Millions play does not
  approach break-even until the advertised jackpot is in the
  <a href="expected-value-of-a-lottery-ticket.html">several-billion-dollar range</a> — territory
  the $5 game has not realistically occupied once sharing risk is included.
</p>

<h2>How this site treats the change</h2>
<p>
  Mixing the 1–25 Mega Ball era with the 1–24 era would make 25 look permanently “cold” for the
  boring reason that it is no longer in the machine. White-ball statistics are still taken from
  the full 5/70 history that began on ${dateLong(mm.config.matrixSince)} —
  ${num(mm.history.count)} drawings — because those balls did not change. Generated Mega Balls
  are capped at 24. The dashboard's “Current rules only” window starts at
  ${dateLong("2025-04-08")} if you want frequencies that ignore the older bonus pool entirely.
</p>
<p>
  Powerball made a much larger matrix change in 2015, in the opposite direction: it made the
  jackpot <em>harder</em> so rolls would last longer.
  <a href="powerball-2015-rule-change.html">That redesign created the billion-dollar era</a>.
  Mega Millions in 2025 did the smaller thing — shave one ball off the bonus pool, raise the
  price, and put the multiplier inside the ticket.
</p>

${adSlot("guide-mid")}

<h2>The current prize tiers</h2>
${table(
  ["Match", "Base prize", "Odds"],
  mm.table.rows.map((r) => [
    r.match,
    r.prize === "Jackpot" ? "<b>Jackpot</b>" : r.prize,
    oneIn(r.oneIn),
  ]),
  {
    caption: `Current Mega Millions prize chart (${mm.config.matrixLabel}). Non-jackpot prizes are multiplied by the 2X–10X printed on the ticket. Overall odds of winning something: ${oneIn(mm.table.anyPrizeOneIn)}.`,
  },
)}

${sourceList(["mm2025", "mm2025md", "mmHowTo", "mmHome"], 1)}
`;
  },
};

/* --------------------------------- 10 ------------------------------------ */

const moreTicketsOdds = {
  slug: "does-buying-more-lottery-tickets-improve-your-odds",
  kicker: "Odds",
  title: "Does Buying More Lottery Tickets Improve Your Odds?",
  seoTitle:
    "Does Buying More Lottery Tickets Improve Your Odds? The Math for 1, 5, 10 and 100 Tickets",
  dek: "Distinct tickets raise jackpot probability in a straight line with how many you buy — and cost rises at the same rate. Absolute odds stay tiny.",
  description:
    "Does buying more lottery tickets improve your odds? See Mega Millions and Powerball jackpot chances and cost for 1, 5, 10 and 100 distinct tickets in one drawing — and why duplicates do not help.",
  published: "2026-09-27",
  updated: "2026-09-27",
  publicationMeta:
    "figures calculated from official jackpot odds and ticket prices verified on September 27, 2026",
  faq: [
    {
      q: "Does buying more lottery tickets improve your jackpot odds?",
      a: "Yes, linearly for distinct combinations in one drawing: n distinct tickets give n times the one-ticket jackpot probability. Absolute odds stay tiny, and cost scales at the same rate.",
      plain:
        "Yes, linearly for distinct combinations in one drawing: n distinct tickets give n times the one-ticket jackpot probability. Absolute odds stay tiny, and cost scales at the same rate.",
    },
    {
      q: "Do duplicate tickets of the same numbers help?",
      a: "No. Buying the same combination more than once in one drawing does not raise the chance that combination is drawn. It only multiplies how many claims you would have if that combination wins.",
      plain:
        "No. Buying the same combination more than once in one drawing does not raise the chance that combination is drawn. It only multiplies how many claims you would have if that combination wins.",
    },
    {
      q: "Is 100 tickets enough to make winning the jackpot likely?",
      a: "No. One hundred distinct Mega Millions or Powerball tickets still leave you at about 1 in 2.9 million for the jackpot — a hundred times better than one ticket, and still extremely unlikely.",
      plain:
        "No. One hundred distinct Mega Millions or Powerball tickets still leave you at about 1 in 2.9 million for the jackpot — a hundred times better than one ticket, and still extremely unlikely.",
    },
    {
      q: "Does buying more tickets improve expected value?",
      a: "No. Expected value per dollar stays essentially the same when you buy more tickets at the same price and odds. More tickets scale total chance and total spend together; they do not create a better bet.",
      plain:
        "No. Expected value per dollar stays essentially the same when you buy more tickets at the same price and odds. More tickets scale total chance and total spend together; they do not create a better bet.",
    },
  ],
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const mmN = mm.config.jackpotOdds;
    const pbN = pb.config.jackpotOdds;
    const mmPrice = 5;
    const pbPrice = 2;
    const mmRows = comparisonRows(mmN, mmPrice);
    const pbRows = comparisonRows(pbN, pbPrice);
    const mmTable = table(
      ["Tickets", "Jackpot probability", "Approx. 1 in X", "Percentage chance", "Cost per drawing"],
      mmRows.map((r) => [
        String(r.tickets),
        r.probabilityLabel,
        r.approxOneInLabel,
        r.percentageLabel,
        r.costLabel,
      ]),
      {
        caption: `Mega Millions jackpot odds for distinct tickets in one drawing (N = ${num(mmN)}; $5 per play). Figures from n / N.`,
      },
    );
    const pbTable = table(
      ["Tickets", "Jackpot probability", "Approx. 1 in X", "Percentage chance", "Cost per drawing"],
      pbRows.map((r) => [
        String(r.tickets),
        r.probabilityLabel,
        r.approxOneInLabel,
        r.percentageLabel,
        r.costLabel,
      ]),
      {
        caption: `Powerball jackpot odds for distinct tickets in one drawing (N = ${num(pbN)}; $2 per play). Figures from n / N.`,
      },
    );
    const mm100 = mmRows.find((r) => r.tickets === 100);
    const pb100 = pbRows.find((r) => r.tickets === 100);

    return `
<p class="lede">
  Yes — if the tickets are <em>different</em> combinations in the same drawing. Buying more tickets increases the chance of winning, but it does not make any individual number combination more likely to be drawn. Jackpot probability rises in a straight line with the
  ticket count, absolute odds stay tiny, and cost grows at the same rate.
</p>

<h2>What changes when you buy more tickets?</h2>
<p>
  Focus on one drawing and the jackpot only. Let N be the number of equally likely winning
  combinations — ${num(mmN)} for Mega Millions and ${num(pbN)} for Powerball under the current
  published matrices. One ticket covering a single combination has jackpot probability
  1&nbsp;/&nbsp;N.
</p>
<p>
  If you buy <b>n distinct</b> combinations in that same drawing (and n is no larger than N),
  those tickets cover n of the N slots. The jackpot probability is simply:
</p>
<p class="formula">P(jackpot) = n / N</p>
<p>
  That is linear in n: 10 distinct tickets give ten times the jackpot chance of one ticket;
  100 give one hundred times. Nothing mystical happens to the balls. You are covering more of
  the finite list of combinations. The drawing itself still picks one winning combination at
  random; past results do not change the next draw — that is the
  <a href="independent-trials.html">law of independent trials</a>. How N itself is derived from
  the ball matrices is covered in
  <a href="how-lottery-odds-are-calculated.html">how lottery odds are calculated</a>.
</p>
<p>
  This guide stays on a different question: how jackpot chance and cost move when you change
  the ticket count in one drawing (with a short note on stacking tickets across many drawings).
</p>

${adSlot("guide-mid")}

<h2>Mega Millions: 1 vs 5 vs 10 vs 100</h2>
<p>
  Mega Millions currently uses a 5-of-70 white-ball matrix plus a Mega Ball from 1–24, for
  N&nbsp;=&nbsp;${num(mmN)} possible jackpot combinations. Official materials list the jackpot
  odds as ${oneIn(mmN)} and the price as $5 per play (verified against the official How to Play
  chart; access date September 27, 2026).
</p>
${mmTable}
<p>
  One hundred distinct Mega Millions tickets cost $500 for that drawing and lift the jackpot
  chance to ${mm100.approxOneInLabel} — exactly 100× a single ticket, and still about one in
  2.9&nbsp;million.
</p>

<h2>Powerball: 1 vs 5 vs 10 vs 100</h2>
<p>
  Powerball uses 5-of-69 white balls plus a Powerball from 1–26, for N&nbsp;=&nbsp;${num(pbN)}.
  The official prize chart lists jackpot odds of ${oneIn(pbN)} for a $2 play (access date
  September 27, 2026).
</p>
${pbTable}
<p>
  One hundred distinct Powerball tickets cost $200 and move the jackpot chance to
  ${pb100.approxOneInLabel} — again 100× one ticket, and still about one in 2.9&nbsp;million.
</p>

<h2>Why 100× chance is still tiny</h2>
<p>
  Multiplying a microscopic probability by 100 leaves a microscopic probability. Roughly
  1&nbsp;in&nbsp;2.9&nbsp;million is better than 1&nbsp;in&nbsp;290&nbsp;million in the ratio
  sense, and it is nowhere near "likely." You would not describe a 1-in-2.9-million event as
  something you expect to see in ordinary life. Spending $500 (Mega Millions) or $200
  (Powerball) does not change that description; it only buys a larger slice of the same
  enormous combination space.
</p>
<p>
  A useful mental check: 100× the chance is not the same as "close to winning," and it is not
  a reason to treat lottery play as a plan. Cost scaled by the same factor.
</p>

${callout(
  "Different combinations vs duplicate tickets",
  `<p>
    <b>Distinct combinations</b> in one drawing raise jackpot hit probability: each new unique
    line covers another slot in the N-combination list, so P = n / N.
  </p>
  <p>
    <b>Duplicate tickets</b> — the same five white balls and the same bonus ball, bought more
    than once for the same drawing — do <em>not</em> increase the chance that combination is
    drawn. The machine still selects one winning combination. Duplicates only multiply how many
    identical claims you would hold <em>if</em> that combination wins. Jackpot splitting and
    state payout rules are a separate topic from hit probability; they do not turn duplicates
    into a larger chance of matching the draw.
  </p>
  <p>
    Buying more tickets increases the chance of winning, but it does not make any individual number combination more likely to be drawn.
  </p>`,
  "warn",
)}

<h2>Multiple tickets across multiple drawings</h2>
<p>
  A different formula applies when each ticket is an independent attempt — for example one
  ticket per drawing across many drawings, or any sequence of trials that each have
  probability 1/N of success:
</p>
<p class="formula">P(at least one jackpot) = 1 − (1 − 1/N)<sup>n</sup></p>
<p>
  For the tiny jackpot probabilities here, that complement stays extremely close to the simple
  n/N line when n is small compared with N. One hundred independent Mega Millions attempts are
  still on the order of 1&nbsp;in&nbsp;2.9&nbsp;million for at least one jackpot; they are not a
  meaningful leap toward "likely." Use the
  <a href="../tools/odds-explorer.html">Lottery Odds Explorer</a> if you want to compare
  chance by ticket count and drawing count interactively — it applies the same published
  one-ticket odds to the attempts you enter.
</p>

<h2>Cost grows at the same rate as chances</h2>
<p>
  Under P = n / N for distinct tickets in one drawing, multiplying tickets by k multiplies
  jackpot probability by k and multiplies spend by k. Mega Millions: 1 → 100 tickets moves
  chance ×100 and cost from $5 to $500. Powerball: 1 → 100 tickets moves chance ×100 and cost
  from $2 to $200. There is no bulk discount on probability. The
  <a href="../tools/lottery-spending-calculator.html">Lottery Spending Calculator</a> is the
  place to see what a weekly or monthly ticket habit adds up to over a year — before the
  jackpot fantasy does the arithmetic for you.
</p>

<h2>Does buying more improve expected value?</h2>
<p>
  Odds and expected value are not the same question. Expected value asks what a ticket returns
  on average once every prize tier and the jackpot’s real after-tax, shared value are included.
  Buying more tickets at the same price and the same odds scales total expected return and total
  cost together; it does not create a better bet per dollar. For the break-even jackpot math and
  why national jackpot games effectively never get there, see
  <a href="expected-value-of-a-lottery-ticket.html">What is the expected value of a lottery
  ticket?</a>
</p>

<h2>Practical takeaway</h2>
<p>
  If you choose to play, treat extra distinct tickets as a proportional purchase of a still-tiny
  jackpot chance — not as a strategy that bends the odds in your favor. Duplicates do not help
  hit probability. A hundred tickets can feel like a serious effort and still leave you at
  roughly 1&nbsp;in&nbsp;2.9&nbsp;million. Keep any spend inside an entertainment budget you can
  lose without harm, and skip chasing losses after a near-miss that was never a signal.
  <a href="../responsible-play.html">Responsible play</a> resources and problem-gambling help
  lines are there if lottery play stops feeling optional.
</p>

<h2 id="faq">FAQ</h2>
<dl class="faq-list">
  <dt>Does buying more lottery tickets improve your jackpot odds?</dt>
  <dd>
    Yes, linearly for distinct combinations in one drawing: n distinct tickets give n times the
    one-ticket jackpot probability. Absolute odds stay tiny, and cost scales at the same rate.
  </dd>
  <dt>Do duplicate tickets of the same numbers help?</dt>
  <dd>
    No. Buying the same combination more than once in one drawing does not raise the chance that
    combination is drawn. It only multiplies how many claims you would have if that combination
    wins.
  </dd>
  <dt>Is 100 tickets enough to make winning the jackpot likely?</dt>
  <dd>
    No. One hundred distinct Mega Millions or Powerball tickets still leave you at about 1 in
    2.9 million for the jackpot — a hundred times better than one ticket, and still extremely
    unlikely.
  </dd>
  <dt>Does buying more tickets improve expected value?</dt>
  <dd>
    No. Expected value per dollar stays essentially the same when you buy more tickets at the
    same price and odds. More tickets scale total chance and total spend together; they do not
    create a better bet.
  </dd>
</dl>

<section class="sources">
  <h2>Sources and methodology</h2>
  <p>
    Same-draw table values are computed as <strong>n / N</strong> for distinct tickets, with
    N taken from the published jackpot combination counts used across this site
    (Mega Millions ${num(mmN)}; Powerball ${num(pbN)}). Multi-draw "at least one" figures use
    <strong>1 − (1 − 1/N)<sup>n</sup></strong>, evaluated with a numerically stable
    <code>-expm1(n · log1p(−p))</code> form. Ticket prices are the current official play prices
    ($5 Mega Millions; $2 Powerball). Official odds and prices were re-checked against primary
    sources on September 27, 2026. Rounding for "approx. 1 in X" uses nearest-integer
    reciprocals; percentage columns use fixed decimal display without scientific notation.
    Jackpot-only focus: this page does not invent multi-ticket any-prize products.
  </p>
  <ul>
    <li><a href="https://www.megamillions.com/How-to-Play.aspx" target="_blank" rel="noopener nofollow">Mega Millions — How to Play and prize tiers</a> (jackpot odds 1 in 290,472,336; $5 per play; accessed September 27, 2026)</li>
    <li><a href="https://www.powerball.com/powerball-prize-chart" target="_blank" rel="noopener nofollow">Powerball — prize chart and official odds</a> (jackpot odds 1 in 292,201,338; $2 play basis; accessed September 27, 2026)</li>
    <li><a href="https://www.megamillions.com/" target="_blank" rel="noopener nofollow">Mega Millions — official site</a></li>
    <li><a href="https://www.powerball.com/" target="_blank" rel="noopener nofollow">Powerball — official site</a></li>
  </ul>
  <p>
    See also <a href="../methodology.html">our methodology and corrections policy</a>.
  </p>
</section>

<h2>Related guides and tools</h2>
<ul>
  <li><a href="../tools/odds-explorer.html">Lottery Odds Explorer</a> — compare chance by ticket count and drawings</li>
  <li><a href="../tools/lottery-spending-calculator.html">Lottery Spending Calculator</a> — see weekly, monthly, and yearly spend</li>
  <li><a href="independent-trials.html">Are lottery drawings independent?</a></li>
  <li><a href="how-lottery-odds-are-calculated.html">How are lottery odds calculated?</a></li>
  <li><a href="expected-value-of-a-lottery-ticket.html">What is the expected value of a lottery ticket?</a></li>
  <li><a href="../responsible-play.html">Responsible play</a></li>
</ul>
`;
  },
};

/* --------------------------------- 11 ------------------------------------- */

const sharedJackpot = {
  slug: "what-happens-when-multiple-people-win-the-lottery-jackpot",
  kicker: "Money",
  title: "What Happens When Multiple People Win the Lottery Jackpot?",
  seoTitle:
    "What Happens When Multiple People Win the Lottery Jackpot? How the Prize Is Split",
  dek: "When more than one ticket hits the jackpot, the prize is split among those tickets — not duplicated for every winner. Pools and cash-versus-annuity choices are a separate layer.",
  description:
    "Learn how Powerball and Mega Millions jackpots are divided when multiple tickets win, how cash and annuity choices work, and why a lottery pool is different.",
  published: "2026-09-27",
  updated: "2026-09-27",
  publicationMeta:
    "rules re-checked against official Powerball and Mega Millions materials and example state claim guidance on September 27, 2026",
  faq: [
    {
      q: "Do multiple jackpot winners each get the full advertised jackpot?",
      a: "No. When more than one ticket wins the jackpot in the same drawing, the jackpot is generally divided among those jackpot-winning tickets. Each ticket does not receive the full advertised amount.",
      plain:
        "No. When more than one ticket wins the jackpot in the same drawing, the jackpot is generally divided among those jackpot-winning tickets. Each ticket does not receive the full advertised amount.",
    },
    {
      q: "Is a lottery pool the same as multiple independent winning tickets?",
      a: "No. Multiple independent jackpot-winning tickets split the jackpot among those tickets. A pool that owns one winning ticket splits that ticket’s share among members through claim procedures — a different situation.",
      plain:
        "No. Multiple independent jackpot-winning tickets split the jackpot among those tickets. A pool that owns one winning ticket splits that ticket’s share among members through claim procedures — a different situation.",
    },
    {
      q: "Can each jackpot-winning ticket choose cash or annuity?",
      a: "Official Powerball and Mega Millions materials describe cash and annuity options for jackpot winners, and multi-ticket examples show U.S. tickets choosing independently for their share. Exact election deadlines and claim steps vary by state lottery.",
      plain:
        "Official Powerball and Mega Millions materials describe cash and annuity options for jackpot winners, and multi-ticket examples show U.S. tickets choosing independently for their share. Exact election deadlines and claim steps vary by state lottery.",
    },
    {
      q: "Do all prize tiers get split the same way as the jackpot?",
      a: "No. Do not assume every tier is split like the jackpot. The jackpot is the classic shared (pari-mutuel) top prize; many lower tiers are published as fixed amounts, with important jurisdiction exceptions such as California Mega Millions.",
      plain:
        "No. Do not assume every tier is split like the jackpot. The jackpot is the classic shared (pari-mutuel) top prize; many lower tiers are published as fixed amounts, with important jurisdiction exceptions such as California Mega Millions.",
    },
    {
      q: "Do duplicate tickets of the same numbers raise the chance of winning?",
      a: "No. Buying the same combination more than once does not make that combination more likely to be drawn. If that combination does hit and more than one valid jackpot-winning ticket exists, the ticket count can affect how the jackpot is divided — that is a payout question, not a hit-probability boost.",
      plain:
        "No. Buying the same combination more than once does not make that combination more likely to be drawn. If that combination does hit and more than one valid jackpot-winning ticket exists, the ticket count can affect how the jackpot is divided — that is a payout question, not a hit-probability boost.",
    },
  ],
  body(ctx) {
    const records = ctx.records;
    const pbTriple = records.find((r) => r.tickets === 3) || records[5];
    const pbDouble = records.find((r) => r.tickets === 2) || records[2];
    const shareRows = illustrativeAnnuityShareRows();
    const shareTable = table(
      ["Winning tickets", "Each ticket’s share of a $600M annuity", "Share of the advertised total"],
      shareRows.map((r) => [
        String(r.tickets),
        `<b>${r.shareLabel}</b>`,
        r.tickets === 1 ? "100%" : r.tickets === 3 ? "33.33% (1/3)" : r.percentLabel,
      ]),
      {
        caption:
          "Illustrative only: a simple pre-tax division of a stated $600 million annuity figure. Not a claim estimate, cash value, or after-tax payout.",
      },
    );
    const situationTable = table(
      ["Situation", "What is split?", "Who claims?", "Main rule source"],
      [
        [
          "Multiple independent jackpot-winning tickets",
          "The jackpot among winning <em>tickets</em> (2 → ½, 3 → ⅓)",
          "Each ticket’s owner (or owners) through the selling lottery",
          "Powerball / Mega Millions multi-winner jackpot rules",
        ],
        [
          "One jackpot-winning ticket owned by a pool",
          "That ticket’s jackpot share among pool members",
          "Group claim procedures set by the selling state lottery",
          "State lottery group-claim guidance (e.g. California Lottery as one example)",
        ],
      ],
      {
        caption:
          "Two different sharing problems. Ticket-level jackpot splits and pool-member splits are not the same process.",
      },
    );

    return `
<p class="lede">
  When more than one ticket wins the jackpot in the same drawing, the jackpot is generally
  divided among those jackpot-winning tickets — each ticket does <em>not</em> get the full
  advertised jackpot. A workplace pool that owns a single winning ticket is a different
  situation: that ticket’s share is then divided among members through claim procedures.
</p>

<h2>Divided by winning ticket — not duplicated for every winner</h2>
<p>
  Powerball’s official FAQ states that if there are multiple jackpot-winning tickets in a
  single drawing, the jackpot is awarded on a <strong>pari-mutuel</strong> basis — meaning it
  is split among all winning tickets. Pari-mutuel here simply means the prize pool for that
  tier is divided by the number of winning plays, rather than paying a fixed amount to every
  winner. Mega Millions’ How to Play page says the same idea in plain language: in the event
  of multiple jackpot winners, the jackpot prize will be shared.
</p>
<p>
  Count <strong>tickets</strong>, not headlines that say “winners.” Two valid jackpot tickets
  mean each is looking at about half of the jackpot; three mean about one third. If one person
  somehow holds more than one identical jackpot-winning ticket for the same drawing, treat that
  as a special case and verify the game and jurisdiction rules — do not assume a universal
  nationwide rule for that edge case from this page alone.
</p>
<p>
  Advertised jackpot amounts are estimates until sales (and, for annuities, securities funding)
  are finalized. Official materials are explicit that the cash and annuity figures you saw
  before the draw can move when accounting is complete.
</p>

${adSlot("guide-mid")}

<h2>Illustrative $600&nbsp;million annuity split</h2>
<p>
  The table below is a teaching device only. It takes a stated $600&nbsp;million annuity figure
  and divides it evenly by the number of jackpot-winning tickets. It is <strong>not</strong> a
  claim estimate, a cash-option quote, a tax forecast, or a guarantee of what any lottery would
  pay.
</p>
${shareTable}
<p>
  Read the columns as a simple pre-tax split of an advertised-style annuity number. Sales and
  accounting finalize the real jackpot. Annuity is not cash. Cash is not “advertised annuity
  minus tax.” Taxes, residency, and ownership form (individual, trust, group claim) sit on top
  of the ticket split. Lottery Number Lab does not compute or guarantee payouts.
</p>

<h2>Multiple independent tickets vs one pool-owned ticket</h2>
${situationTable}
${callout(
  "Two situations people often conflate",
  `<p>
    <b>Situation 1 — Multiple independent jackpot-winning tickets.</b> The jackpot is split
    among winning tickets. Two tickets → about half each; three → about one third each.
  </p>
  <p>
    <b>Situation 2 — One winning ticket owned by a pool.</b> The lottery still sees one
    jackpot-winning ticket. That ticket’s share is then divided among members through the
    selling lottery’s group-claim process and whatever written agreement the group kept.
  </p>
  <p>
    California Lottery’s public claim guidance is a useful <em>example</em> of group paperwork
    (including multiple-ownership claim forms for large prizes and IRS Form 5754 in some group
    settings). It is not a United States-wide rulebook. Written pool agreements help with
    recordkeeping; they are not legal advice, and this site is not giving legal or tax advice.
  </p>`,
  "note",
)}

<h2>Cash vs annuity — applied to each ticket’s share</h2>
<p>
  The roadside “jackpot” number is generally an <strong>annuity</strong> presentation. The
  <strong>cash value</strong> is a separate, usually smaller, amount tied to the money actually
  available to fund the prize. After a multi-ticket split, each ticket is dealing with its
  <em>share</em> of those figures — not a second full jackpot.
</p>
<p>
  Official Powerball materials describe a U.S. jackpot winner’s choice between an annuity (one
  immediate payment followed by 29 annual payments that increase by 5% each year) and a
  one-time cash payment, with multi-ticket examples showing each U.S. winning ticket choosing
  independently for its share. Official Mega Millions materials likewise describe a Cash Option
  and an Annuity Option (initial payment followed by 29 annual payments, each 5% larger than the
  previous). Confirm each game’s current payment schedule from its own pages — do not assume the
  two games will always match forever just because they rhyme today.
</p>
<p>
  Election deadlines, default choices if you miss a deadline, anonymity rules, and where you
  must claim all vary by state lottery. For the broader cash-versus-annuity and tax arithmetic
  (federal withholding versus final brackets, state tax variation), see
  <a href="record-jackpots-and-taxes.html">record jackpots and the tax math winners actually
  face</a>. Expected-value math that already treats the jackpot as shareable is in
  <a href="expected-value-of-a-lottery-ticket.html">what is the expected value of a lottery
  ticket?</a>
</p>

<h2>Different states, different claim details</h2>
<p>
  Powerball and Mega Millions set the shared jackpot framework, but you claim where the ticket
  was sold. Claim periods commonly range from about 90 days to one year. Some jurisdictions
  allow more privacy than others; some allow trusts or other entities; group-claim thresholds and
  forms differ. Mega Millions’ FAQ notes that prizes can be shared and that restrictions apply —
  and tells players to check the lottery where the tickets were bought. Treat every state page as
  primary for process; treat this guide as orientation.
</p>

<h2>Do lower prize tiers split the same way?</h2>
<p>
  <strong>Do not claim that every tier splits like the jackpot.</strong> The jackpot is the
  standard shared top prize: the jackpot prize pool is divided by the number of jackpot-winning
  plays. Many lower tiers are published as fixed dollar amounts (or fixed amounts times a
  multiplier). Separately, some jurisdictions — notably California for Mega Millions — pay
  certain prizes on a pari-mutuel basis that can differ from the fixed amounts shown on national
  charts. Always read the chart and the jurisdiction footnotes for the tier you care about.
</p>

<h2>What about duplicate tickets of the same numbers?</h2>
<p>
  Buying the same combination more than once does <em>not</em> raise the chance that combination
  is drawn. That hit-probability point is the same one made in
  <a href="does-buying-more-lottery-tickets-improve-your-odds.html">does buying more lottery
  tickets improve your odds?</a>: duplicates are not a larger slice of the combination space.
</p>
<p>
  Payout is a different question. If that combination does hit, and more than one valid
  jackpot-winning ticket exists for the drawing, official multi-winner rules mean the jackpot is
  divided among those winning tickets. Duplicates can therefore matter to <em>how a prize is
  shared if it hits</em>; they still do not make the draw more likely to land on your numbers.
</p>

<h2>What pools should document</h2>
<p>
  If you play in a group, paperwork is about clarity — not about beating the odds. Useful
  records typically include who contributed how much, which drawings and ticket serials are
  covered, how winnings would be divided, who holds the physical tickets, and who is authorized
  to claim. Sign the backs of tickets according to your lottery’s instructions. Keep copies.
  Agree in advance how disputes get resolved. None of that is a substitute for the selling
  lottery’s claim forms or for advice from a qualified attorney or tax professional if a large
  prize actually arrives.
</p>

<h2>Real shared-jackpot examples</h2>
<p>
  Shared jackpots are not theoretical. On the site’s record board, the
  ${pbTriple.date} Powerball jackpot of about ${pbTriple.annuity.toFixed(3)}&nbsp;billion was
  won by <b>${pbTriple.tickets} tickets</b> (${pbTriple.where}) — a three-way ticket split of
  the first U.S. lottery jackpot over a billion dollars. The ${pbDouble.date} Powerball jackpot
  of about ${pbDouble.annuity.toFixed(3)}&nbsp;billion was won by <b>${pbDouble.tickets}
  tickets</b> (${pbDouble.where}). Those examples are ticket-level splits of one drawing’s
  jackpot; they are not the same thing as a single ticket later divided among office-pool
  members.
</p>
<p>
  Official Powerball FAQ examples for multi-ticket drawings also walk through equal cash-value
  shares when two or three tickets win, including cases where U.S. and UK tickets share the
  jackpot pool under the 2026 expansion rules — still divided by winning ticket count, with U.S.
  tickets retaining a cash-or-annuity choice for their share.
</p>

<h2>Practical takeaway</h2>
<p>
  Plan for the advertised jackpot to be a shared pie when more than one ticket hits, and plan
  for a pool’s internal split to be a second pie-cutting step if your group owns only one of
  those tickets. Cash and annuity choices attach to a ticket’s share; taxes and residency attach
  after that. None of this changes the jackpot odds themselves — covering how those odds are
  built is separate reading in
  <a href="how-lottery-odds-are-calculated.html">how lottery odds are calculated</a> and
  <a href="mega-millions-vs-powerball-odds.html">Mega Millions vs Powerball odds</a>. If you
  play at all, keep spend inside an entertainment budget you can lose without harm.
  <a href="../responsible-play.html">Responsible play</a> resources are there if lottery play
  stops feeling optional.
</p>

<h2 id="faq">FAQ</h2>
<dl class="faq-list">
  <dt>Do multiple jackpot winners each get the full advertised jackpot?</dt>
  <dd>
    No. When more than one ticket wins the jackpot in the same drawing, the jackpot is generally
    divided among those jackpot-winning tickets. Each ticket does not receive the full advertised
    amount.
  </dd>
  <dt>Is a lottery pool the same as multiple independent winning tickets?</dt>
  <dd>
    No. Multiple independent jackpot-winning tickets split the jackpot among those tickets. A
    pool that owns one winning ticket splits that ticket’s share among members through claim
    procedures — a different situation.
  </dd>
  <dt>Can each jackpot-winning ticket choose cash or annuity?</dt>
  <dd>
    Official Powerball and Mega Millions materials describe cash and annuity options for jackpot
    winners, and multi-ticket examples show U.S. tickets choosing independently for their share.
    Exact election deadlines and claim steps vary by state lottery.
  </dd>
  <dt>Do all prize tiers get split the same way as the jackpot?</dt>
  <dd>
    No. Do not assume every tier is split like the jackpot. The jackpot is the classic shared
    (pari-mutuel) top prize; many lower tiers are published as fixed amounts, with important
    jurisdiction exceptions such as California Mega Millions.
  </dd>
  <dt>Do duplicate tickets of the same numbers raise the chance of winning?</dt>
  <dd>
    No. Buying the same combination more than once does not make that combination more likely to
    be drawn. If that combination does hit and more than one valid jackpot-winning ticket exists,
    the ticket count can affect how the jackpot is divided — that is a payout question, not a
    hit-probability boost.
  </dd>
</dl>

<section class="sources">
  <h2>Sources and methodology</h2>
  <p>
    Ticket-share illustrations use equal division of a stated annuity figure by the number of
    jackpot-winning tickets. They are pre-tax teaching numbers only. Official multi-winner,
    cash/annuity, and group-claim statements were re-checked on September 27, 2026. Record-board
    multi-ticket examples come from the same published jackpot records used elsewhere on this
    site. This page is informational entertainment — not legal, tax, or claims advice.
  </p>
  <ul>
    <li><a href="https://www.powerball.com/faqs" target="_blank" rel="noopener nofollow">Powerball — FAQs</a> (multi-ticket pari-mutuel jackpot split; cash vs annuity; U.S. share election examples; accessed September 27, 2026)</li>
    <li><a href="https://www.powerball.com/" target="_blank" rel="noopener nofollow">Powerball — official site</a> (prize and jackpot materials; accessed September 27, 2026)</li>
    <li><a href="https://www.megamillions.com/How-to-Play.aspx" target="_blank" rel="noopener nofollow">Mega Millions — How to Play</a> (multiple jackpot winners share the jackpot; California pari-mutuel footnote for some prizes; accessed September 27, 2026)</li>
    <li><a href="https://www.megamillions.com/FAQs" target="_blank" rel="noopener nofollow">Mega Millions — FAQs</a> (cash vs annuity; group sharing possible with state restrictions; accessed September 27, 2026)</li>
    <li><a href="https://www.calottery.com/en/claim-a-prize" target="_blank" rel="noopener nofollow">California Lottery — Claim a Prize</a> (group-claim example for single-ticket pools; accessed September 27, 2026)</li>
  </ul>
  <p>
    See also <a href="../methodology.html">our methodology and corrections policy</a>.
  </p>
</section>

<h2>Related guides and tools</h2>
<ul>
  <li><a href="does-buying-more-lottery-tickets-improve-your-odds.html">Does buying more lottery tickets improve your odds?</a> — distinct tickets vs duplicates</li>
  <li><a href="mega-millions-vs-powerball-odds.html">Mega Millions vs Powerball: the odds compared</a></li>
  <li><a href="expected-value-of-a-lottery-ticket.html">What is the expected value of a lottery ticket?</a></li>
  <li><a href="record-jackpots-and-taxes.html">Record jackpots and the tax math winners actually face</a></li>
  <li><a href="how-lottery-odds-are-calculated.html">How are lottery odds calculated?</a></li>
  <li><a href="../tools/odds-explorer.html">Lottery Odds Explorer</a> — published odds by ticket and drawing count</li>
  <li><a href="../responsible-play.html">Responsible play</a></li>
</ul>
`;
  },
};

/* --------------------------------- 12 ------------------------------------- */

const quickPickVsManual = {
  slug: "quick-pick-vs-choosing-your-own-lottery-numbers",
  kicker: "Odds",
  title: "Quick Pick vs. Choosing Your Own Lottery Numbers: Does Either Have Better Odds?",
  seoTitle: "Quick Pick vs. Your Own Lottery Numbers: Does Either Have Better Odds?",
  dek: "Neither method changes jackpot odds for a valid line. Selection is convenience; prize sharing is a separate risk from drawing probability.",
  description:
    "Quick Pick and self-chosen lottery numbers have the same odds. Learn what random selection changes, what it does not, and how popular picks may affect prize sharing.",
  published: "2026-09-27",
  updated: "2026-09-27",
  publicationMeta:
    "Quick Pick / Easy Pick definitions and jackpot odds verified against official Mega Millions and Powerball materials",
  faq: [
    {
      q: "Does Quick Pick have better jackpot odds than choosing your own numbers?",
      a: "No. For Mega Millions and Powerball, any one valid line has the same jackpot probability whether the terminal (or another RNG) selected it or you marked it by hand. Selection method is not drawing probability.",
      plain:
        "No. For Mega Millions and Powerball, any one valid line has the same jackpot probability whether the terminal (or another RNG) selected it or you marked it by hand. Selection method is not drawing probability.",
    },
    {
      q: "Are birthday numbers worse odds in the drawing?",
      a: "No. Birthdays and other calendar-limited patterns are not lower-probability combinations in the draw. Every valid combination remains equally likely. The separate question is whether popular patterns may be shared by more players if they hit — which affects prize sharing, not hit chance.",
      plain:
        "No. Birthdays and other calendar-limited patterns are not lower-probability combinations in the draw. Every valid combination remains equally likely. The separate question is whether popular patterns may be shared by more players if they hit — which affects prize sharing, not hit chance.",
    },
    {
      q: "Why do many jackpot stories mention Quick Pick?",
      a: "Quick Pick and Easy Pick are widely used convenience features, so many tickets — and therefore many winners — can be randomly selected without that proving better drawing odds. Without primary sales-mix data, do not treat winner anecdotes as a win-rate percentage.",
      plain:
        "Quick Pick and Easy Pick are widely used convenience features, so many tickets — and therefore many winners — can be randomly selected without that proving better drawing odds. Without primary sales-mix data, do not treat winner anecdotes as a win-rate percentage.",
    },
    {
      q: "Do website number generators improve lottery odds?",
      a: "No. A site generator that produces a valid random line is entertainment and convenience, not a prediction or recommendation. It does not raise jackpot probability above any other valid line.",
      plain:
        "No. A site generator that produces a valid random line is entertainment and convenience, not a prediction or recommendation. It does not raise jackpot probability above any other valid line.",
    },
    {
      q: "If I buy several lines, should they be Quick Pick or manual?",
      a: "For hit probability, what matters is covering distinct valid combinations — not whether each line was Quick Pick or hand-marked. Duplicates do not raise the chance a combination is drawn. Ticket-count math is covered separately; this page is about selection method.",
      plain:
        "For hit probability, what matters is covering distinct valid combinations — not whether each line was Quick Pick or hand-marked. Duplicates do not raise the chance a combination is drawn. Ticket-count math is covered separately; this page is about selection method.",
    },
    {
      q: "Does playing the same numbers every drawing change the odds?",
      a: "No. Each drawing is an independent trial. Reusing the same valid line does not make it hotter, colder, due, or overdue. Past results do not change the next draw’s probability.",
      plain:
        "No. Each drawing is an independent trial. Reusing the same valid line does not make it hotter, colder, due, or overdue. Past results do not change the next draw’s probability.",
    },
  ],
  body(ctx) {
    const mm = ctx.mm;
    const pb = ctx.pb;
    const mmN = mm.config.jackpotOdds;
    const pbN = pb.config.jackpotOdds;

    const conceptsTable = table(
      ["Concept", "What it means", "What it does not mean"],
      [
        [
          "Drawing probability",
          "Every valid combination is equally likely; Quick Pick does not change N",
          "That the terminal “knows” a better line",
        ],
        [
          "Selection method",
          "Quick Pick / Easy Pick, manual marking, or a site RNG — convenience and entertainment",
          "A prediction system or odds upgrade",
        ],
        [
          "Prize-sharing risk",
          "If a popular pattern hits, more players may hold it — a payout split question",
          "Lower (or higher) chance that pattern is drawn",
        ],
      ],
      {
        caption:
          "Three ideas people mix together. Only the first controls jackpot hit probability for one valid line.",
      },
    );

    const comparisonTable = table(
      ["Question", "Quick Pick / Easy Pick", "Choosing your own numbers"],
      [
        ["Who selects the line?", "Lottery terminal / gaming system RNG", "You (playslip, app, or verbal entry)"],
        ["Jackpot odds for one valid line", "Same", "Same"],
        ["Can repeat a prior winning combination?", "Yes", "Yes"],
        ["Can another player hold the same line?", "Yes", "Yes"],
        ["Predicts the draw?", "No", "No"],
      ],
      {
        caption:
          "Selection method changes how the line is produced, not whether that line is equally likely in the drawing.",
      },
    );

    const sameOddsTable = table(
      ["Game", "Matrix", "Play price", "Jackpot odds (one valid line)"],
      [
        [
          mm.config.name,
          mm.config.matrixLabel,
          mm.config.ticketPrice,
          `<b>${oneIn(mmN)}</b> — Quick Pick or manual`,
        ],
        [
          pb.config.name,
          pb.config.matrixLabel,
          pb.config.ticketPrice,
          `<b>${oneIn(pbN)}</b> — Quick Pick or manual`,
        ],
      ],
      {
        caption:
          "Published jackpot combination counts and play prices. Figures from official odds/matrix materials — not from draw-history sampling. Access date September 27, 2026.",
      },
    );

    return `
<p class="lede">
  Neither Quick Pick nor choosing your own numbers has better drawing odds. A valid Quick Pick
  line and a valid manual line have the same jackpot chance. Selection method is not drawing
  probability.
</p>

<h2>What Quick Pick (or Easy Pick) does</h2>
<p>
  Official Mega Millions materials describe choosing six numbers from the two pools
  <em>or</em> selecting <strong>Easy Pick/Quick Pick</strong>. State Powerball rules define
  Quick Pick (sometimes labeled Easy Pick / EP) as a feature that lets the gaming system or
  terminal randomly select the numbers for a play. In plain terms: the lottery computer fills
  a valid line for you so you do not have to mark a playslip.
</p>
<p>
  That is a convenience feature at the point of sale. It is not a forecast of the next draw,
  and it does not rewrite the game’s combination count. A site number generator that also
  emits a valid random line sits in the same conceptual bucket — entertainment and convenience,
  not prediction.
</p>

${adSlot("guide-mid")}

<h2>Three concepts people mix up</h2>
${conceptsTable}
${callout(
  "Keep the labels separate",
  `<p>
    <b>Drawing probability</b> is about the balls and the matrix: all valid combinations are
    equal, and Quick Pick does not change N.
  </p>
  <p>
    <b>Selection method</b> is how your ticket’s numbers were produced — terminal Quick Pick /
    Easy Pick, manual choice, or a website RNG. That choice is convenience, not an odds upgrade.
  </p>
  <p>
    <b>Prize-sharing risk</b> is what happens <em>if</em> a line hits and other players hold it
    too. Sharing is separate from draw odds. This guide does not quantify popular-pattern
    frequencies without official sales-mix data, and it does not claim that Quick Pick wins
    jackpots alone or that manual picks always share more.
  </p>`,
  "note",
)}

<h2>Why the odds are the same</h2>
<p>
  Mega Millions and Powerball each have a fixed number of equally likely jackpot combinations —
  call that number N. One valid ticket covers one of those N slots, so the jackpot probability
  is 1&nbsp;/&nbsp;N. How you chose the six numbers does not add or remove slots from the list.
  A Quick Pick that prints 03-17-22-41-68 with Mega Ball 09 is the same mathematical object as
  a hand-marked ticket with those numbers.
</p>
<p>
  How N is built from the white-ball and bonus pools is covered in
  <a href="how-lottery-odds-are-calculated.html">how lottery odds are calculated</a>. The
  tier-by-tier comparison of the two games is in
  <a href="mega-millions-vs-powerball-odds.html">Mega Millions vs Powerball odds</a>.
</p>
${comparisonTable}

<h2>Mega Millions and Powerball side by side</h2>
<p>
  Re-checked against official How to Play / prize-chart materials on September 27, 2026: Mega
  Millions uses a 5-of-70 + Mega Ball 1–24 matrix at $5 per play; Powerball uses 5-of-69 +
  Powerball 1–26 at $2 per play. Under those published matrices, one valid line has the jackpot
  odds below — regardless of Quick Pick or manual selection.
</p>
${sameOddsTable}
<p>
  If those official matrices or prices change later, the absolute 1-in-N figures move with them;
  the parity between Quick Pick and manual for any one valid line does not. Explore the published
  one-ticket odds interactively with the
  <a href="../tools/odds-explorer.html">Lottery Odds Explorer</a>.
</p>

<h2>Why Quick Pick winners may appear common</h2>
<p>
  Lottery retailers and apps make Quick Pick / Easy Pick the fastest path to a ticket. When a
  large share of tickets is randomly selected, a large share of winners will also be randomly
  selected — even though each ticket still faced the same 1&nbsp;/&nbsp;N chance. Headline
  anecdotes (“the winner used Quick Pick”) describe how a ticket was produced, not a proof that
  Quick Pick beats manual selection.
</p>
<p>
  This page does <strong>not</strong> publish an unsupported “most jackpot winners used Quick
  Pick” percentage. Without primary sales-mix data from the lotteries, winner stories are not a
  win-rate statistic. Convenience volume is not the same thing as better odds.
</p>

<h2>Birthdays, patterns, and “better spread”</h2>
<p>
  Birthday sets (days 1–31), anniversaries, and other calendar-limited patterns are
  <strong>not</strong> lower-probability combinations in the drawing. Every valid line remains
  equally likely. Do not claim that numbers above 31 are “drawn more” in a way that improves a
  ticket’s hit chance — the matrix does not work that way.
</p>
<p>
  What people sometimes mean by “better spread” is really one of three different ideas:
</p>
<ul>
  <li><strong>Multi-ticket distinct lines</strong> — covering more unique combinations raises
  hit probability linearly with how many distinct lines you hold (see
  <a href="does-buying-more-lottery-tickets-improve-your-odds.html">does buying more lottery
  tickets improve your odds?</a>). That is ticket count, not Quick Pick vs manual.</li>
  <li><strong>Popular patterns and sharing</strong> — if many players favor the same memorable
  pattern and it hits, more tickets may share the prize. That is a
  <a href="what-happens-when-multiple-people-win-the-lottery-jackpot.html">shared-jackpot</a>
  question, not a statement that the pattern was less likely to be drawn.</li>
  <li><strong>Hit probability vs share-if-hit</strong> — keep those labels apart. Selection
  folklore often collapses them into one slogan.</li>
</ul>
<p>
  Claims that “hot” or “cold” numbers change the next draw are a different myth entirely; see
  <a href="hot-and-cold-numbers-tested.html">are hot and cold numbers real?</a>
</p>

<h2>Win probability vs prize-sharing risk</h2>
<p>
  For any one valid Mega Millions or Powerball line, jackpot <em>hit</em> probability does not
  care whether a human or a terminal chose the digits. Prize <em>sharing</em> if that line hits
  depends on how many other valid jackpot-winning tickets exist for the same drawing. Popular
  memorable patterns are a sharing hypothesis people discuss; they are not a drawing-odds
  penalty, and this guide will not invent a sales-weighted sharing percentage without official
  mix data.
</p>

<h2>Several lines in one drawing</h2>
<p>
  If you hold more than one line, jackpot hit chance tracks how many <strong>distinct</strong>
  valid combinations you cover — not whether each line was Quick Pick or hand-chosen.
  Duplicates of the same combination do not raise the chance that combination is drawn; they
  only affect identical claims if it hits. That consistency with the more-tickets and
  shared-jackpot guides matters; this page still centers on selection method rather than
  ticket-count arithmetic.
</p>

<h2>Same numbers every drawing</h2>
<p>
  Replaying a favorite set night after night does not make it due. Each drawing is an
  independent trial: the machine does not remember your prior tickets. Past winners are not
  “less likely” next time in the sense that would help you avoid them — and Quick Pick is free
  to emit a prior winning combination again. See
  <a href="independent-trials.html">the law of independent trials</a>.
</p>

<h2>When Quick Pick is convenient</h2>
<p>
  Quick Pick / Easy Pick is useful when you want a valid line quickly, do not care which equally
  likely combination you hold, or are buying several lines and do not want to fill a long
  playslip. Those are convenience reasons — not a strategy claim and not a recommendation to
  play.
</p>

<h2>When people prefer choosing their own</h2>
<p>
  Some players enjoy marking birthdays, lucky numbers, or a fixed set they recognize on the
  ticket. That preference is about meaning and habit. It does not buy better jackpot odds than
  a random valid line, and it does not make the draw more predictable.
</p>

<h2>Practical takeaway</h2>
<p>
  Treat Quick Pick and manual selection as two ways to obtain a valid line with the same
  published 1&nbsp;/&nbsp;N jackpot probability. Do not crown either method a “winner.” If you
  use a website generator, treat it the same way: convenience, not prediction. Keep any lottery
  spend inside an entertainment budget you can lose without harm.
  <a href="../responsible-play.html">Responsible play</a> resources are there if play stops
  feeling optional.
</p>
<p>
  Prefer a random valid line for convenience? The
  <a href="../mega-millions.html">Mega Millions</a> and
  <a href="../powerball.html">Powerball</a> generator pages on this site produce combinations
  for entertainment — they are not predictions, recommendations, or odds improvements.
</p>

<h2 id="faq">FAQ</h2>
<dl class="faq-list">
  <dt>Does Quick Pick have better jackpot odds than choosing your own numbers?</dt>
  <dd>
    No. For Mega Millions and Powerball, any one valid line has the same jackpot probability
    whether the terminal (or another RNG) selected it or you marked it by hand. Selection
    method is not drawing probability.
  </dd>
  <dt>Are birthday numbers worse odds in the drawing?</dt>
  <dd>
    No. Birthdays and other calendar-limited patterns are not lower-probability combinations in
    the draw. Every valid combination remains equally likely. The separate question is whether
    popular patterns may be shared by more players if they hit — which affects prize sharing,
    not hit chance.
  </dd>
  <dt>Why do many jackpot stories mention Quick Pick?</dt>
  <dd>
    Quick Pick and Easy Pick are widely used convenience features, so many tickets — and
    therefore many winners — can be randomly selected without that proving better drawing odds.
    Without primary sales-mix data, do not treat winner anecdotes as a win-rate percentage.
  </dd>
  <dt>Do website number generators improve lottery odds?</dt>
  <dd>
    No. A site generator that produces a valid random line is entertainment and convenience, not
    a prediction or recommendation. It does not raise jackpot probability above any other valid
    line.
  </dd>
  <dt>If I buy several lines, should they be Quick Pick or manual?</dt>
  <dd>
    For hit probability, what matters is covering distinct valid combinations — not whether each
    line was Quick Pick or hand-marked. Duplicates do not raise the chance a combination is
    drawn. Ticket-count math is covered separately; this page is about selection method.
  </dd>
  <dt>Does playing the same numbers every drawing change the odds?</dt>
  <dd>
    No. Each drawing is an independent trial. Reusing the same valid line does not make it
    hotter, colder, due, or overdue. Past results do not change the next draw’s probability.
  </dd>
</dl>

<section class="sources">
  <h2>Sources and methodology</h2>
  <p>
    Jackpot odds and play prices in the side-by-side table are the published combination counts
    and official prices used across this site (Mega Millions ${num(mmN)}; Powerball
    ${num(pbN)}; $5 and $2 respectively under the current matrices). Parity between Quick Pick
    and manual follows from equal likelihood of valid combinations: selection method does not
    change N. Quick Pick / Easy Pick wording was taken from official Mega Millions How to Play
    language and from state Powerball rule definitions of terminal/system random selection.
    Official materials were re-checked on September 27, 2026. This page does not estimate
    Quick Pick winner percentages or popular-pattern sales shares without primary lottery
    sales-mix data.
  </p>
  <ul>
    <li><a href="https://www.megamillions.com/How-to-Play.aspx" target="_blank" rel="noopener nofollow">Mega Millions — How to Play</a> (Easy Pick/Quick Pick option; matrix 5/70 + 1/24; jackpot odds 1 in 290,472,336; $5 per play; accessed September 27, 2026)</li>
    <li><a href="https://www.powerball.com/powerball-prize-chart" target="_blank" rel="noopener nofollow">Powerball — prize chart and official odds</a> (jackpot odds 1 in 292,201,338; $2 play basis; accessed September 27, 2026)</li>
    <li><a href="https://www.powerball.com/" target="_blank" rel="noopener nofollow">Powerball — official site</a> (game materials; accessed September 27, 2026)</li>
    <li><a href="https://www.megamillions.com/" target="_blank" rel="noopener nofollow">Mega Millions — official site</a></li>
  </ul>
  <p>
    See also <a href="../methodology.html">our methodology and corrections policy</a>.
  </p>
</section>

<h2>Related guides and tools</h2>
<ul>
  <li><a href="../mega-millions.html">Mega Millions generator</a> — random valid lines for convenience, not prediction</li>
  <li><a href="../powerball.html">Powerball generator</a> — same idea for Powerball</li>
  <li><a href="../tools/odds-explorer.html">Lottery Odds Explorer</a> — published odds by ticket and drawing count</li>
  <li><a href="does-buying-more-lottery-tickets-improve-your-odds.html">Does buying more lottery tickets improve your odds?</a></li>
  <li><a href="what-happens-when-multiple-people-win-the-lottery-jackpot.html">What happens when multiple people win the jackpot?</a></li>
  <li><a href="independent-trials.html">Are lottery drawings independent?</a></li>
  <li><a href="hot-and-cold-numbers-tested.html">Are hot and cold numbers real?</a></li>
  <li><a href="how-lottery-odds-are-calculated.html">How are lottery odds calculated?</a></li>
  <li><a href="../responsible-play.html">Responsible play</a></li>
</ul>
`;
  },
};

/* --------------------------------- 13 ------------------------------------ */

const unclaimedPrizes = {
  slug: "what-happens-to-unclaimed-lottery-prizes",
  kicker: "Money",
  title: "What Happens to Unclaimed Lottery Prizes?",
  seoTitle: "What Happens to Unclaimed Lottery Prizes After the Claim Deadline?",
  dek: "Claim deadlines vary by the lottery that sold the ticket. An unclaimed multi-state jackpot is returned to participating lotteries by sales share, then each jurisdiction applies its own law.",
  description:
    "Learn what happens when a Powerball or Mega Millions prize is not claimed, why deadlines vary by state, and where unclaimed jackpot money goes.",
  published: "2026-09-28",
  updated: "2026-09-28",
  publicationMeta:
    "Claim rules verified against official Powerball, Mega Millions and state lottery materials",
  faq: [
    {
      q: "How long do I have to claim a Powerball or Mega Millions prize?",
      a: "Claim periods typically range from 90 days to one year from the draw date, depending on the lottery that sold the ticket. Check the back of the ticket and the selling lottery's claim instructions. This is not legal advice.",
      plain:
        "Claim periods typically range from 90 days to one year from the draw date, depending on the lottery that sold the ticket. Check the back of the ticket and the selling lottery's claim instructions. This is not legal advice.",
    },
    {
      q: "What happens to an unclaimed Powerball or Mega Millions jackpot?",
      a: "It does not simply roll into the next jackpot. Participating lotteries receive back their shares based on sales for that draw run, and each jurisdiction then uses the returned money according to its own law.",
      plain:
        "It does not simply roll into the next jackpot. Participating lotteries receive back their shares based on sales for that draw run, and each jurisdiction then uses the returned money according to its own law.",
    },
    {
      q: "Does an unclaimed jackpot roll over into the next drawing?",
      a: "No. Official Powerball and Mega Millions materials describe returning unclaimed Grand Prize or jackpot funds to participating lotteries in proportion to their sales contribution, not rolling that unclaimed jackpot into the next advertised jackpot.",
      plain:
        "No. Official Powerball and Mega Millions materials describe returning unclaimed Grand Prize or jackpot funds to participating lotteries in proportion to their sales contribution, not rolling that unclaimed jackpot into the next advertised jackpot.",
    },
    {
      q: "Are claim deadlines the same in every state?",
      a: "No. Deadlines are set by the selling jurisdiction. Powerball and Mega Millions both describe a common range of about 90 days to one year, with important state-level differences such as California's 180-day draw-game rule and one-year Mega Millions and Powerball jackpot exception.",
      plain:
        "No. Deadlines are set by the selling jurisdiction. Powerball and Mega Millions both describe a common range of about 90 days to one year, with important state-level differences such as California's 180-day draw-game rule and one-year Mega Millions and Powerball jackpot exception.",
    },
    {
      q: "Can I find an expired lottery ticket through a general unclaimed-property search?",
      a: "Do not treat general unclaimed-property searches as a way to recover an expired lottery ticket. An unclaimed winning lottery prize is handled under lottery claim rules. Lost tickets, uncashed payments, and general unclaimed property are different concepts.",
      plain:
        "Do not treat general unclaimed-property searches as a way to recover an expired lottery ticket. An unclaimed winning lottery prize is handled under lottery claim rules. Lost tickets, uncashed payments, and general unclaimed property are different concepts.",
    },
    {
      q: "Does the retailer who sold the ticket receive the unclaimed prize?",
      a: "No. Official materials describe unclaimed prizes as kept by the lottery jurisdiction, with unclaimed jackpot shares returned to participating lotteries. Retailer commissions or selling incentives are separate from the winning prize itself.",
      plain:
        "No. Official materials describe unclaimed prizes as kept by the lottery jurisdiction, with unclaimed jackpot shares returned to participating lotteries. Retailer commissions or selling incentives are separate from the winning prize itself.",
    },
    {
      q: "Does Lottery Number Lab verify claims or confirm that a ticket won?",
      a: "No. Lottery Number Lab does not verify claims. Tools such as Ticket Match are educational comparisons against published drawing history, not official claim verification. Confirm winning numbers and claim steps with the lottery that sold the ticket.",
      plain:
        "No. Lottery Number Lab does not verify claims. Tools such as Ticket Match are educational comparisons against published drawing history, not official claim verification. Confirm winning numbers and claim steps with the lottery that sold the ticket.",
    },
  ],
  body(ctx) {
    const deadlineTable = table(
      ["Jurisdiction (example)", "Draw-game deadline", "Jackpot exception", "What the example shows"],
      [
        [
          "California",
          "Postmarked or received within <b>180 days</b> of the winning draw date",
          "Mega Millions and Powerball <b>Jackpots</b>: postmarked or received within <b>one year</b> from the winning draw date",
          "A jurisdiction can set one deadline for most draw games and a longer deadline for multi-state jackpots",
        ],
        [
          "New York",
          "Winning draw game tickets expire <b>one year</b> from the date of the draw",
          "Same one-year draw-game rule (verify current instructions)",
          "Jurisdictions set their own rules; New York's published one-year deadline applies to draw games generally",
        ],
      ],
      {
        caption:
          "Examples only, not a 50-state chart. Verified September 28, 2026 against official California Lottery and New York Lottery claim materials. Always confirm the ticket's selling lottery.",
      },
    );

    const conceptTable = table(
      ["Concept", "What it usually means", "What it is not"],
      [
        [
          "Unclaimed winning ticket",
          "A valid winning ticket that was not claimed by the selling lottery's deadline",
          "Automatic rollover into the next jackpot, or a findable listing in a general unclaimed-property database",
        ],
        [
          "Lost ticket",
          "A ticket you no longer have; lottery tickets are often bearer instruments unless signed",
          "The same as an already-filed claim, or a guarantee the lottery can recreate the ticket",
        ],
        [
          "Uncashed payment",
          "A prize that was already awarded or processed but a payment instrument was not cashed",
          "An unclaimed winning ticket that never entered the claim process",
        ],
        [
          "General unclaimed property",
          "Assets held by a holder under a state's abandoned-property rules (bank accounts, rebates, and similar)",
          "A substitute path for recovering an expired lottery ticket after the claim deadline",
        ],
      ],
      {
        caption:
          "Keep these labels separate. Lottery claim deadlines and general unclaimed-property programs answer different questions.",
      },
    );

    return `
<p class="lede">
  A winning ticket generally expires if it is not claimed by the selling lottery's deadline.
  Claim periods vary by jurisdiction. An unclaimed Powerball or Mega Millions jackpot does not
  simply roll into the next jackpot; the participating lotteries receive back their shares, and
  each jurisdiction handles the returned money according to its own law.
</p>

<h2>The claim deadline comes first</h2>
<p>
  Before asking where unclaimed prize money goes, ask whether the claim window is still open.
  Powerball's official FAQ says ticket expiration dates typically vary from
  <strong>90 days to one year</strong> depending on the selling jurisdiction, that the expiration
  date is often listed on the back of the ticket, and that players should check with their lottery
  if it is not listed. Mega Millions' FAQ similarly states that claim periods vary by jurisdiction
  and range from <strong>90 days to one year from the draw date</strong>.
</p>
<p>
  Prizes are claimed in the jurisdiction where the ticket was purchased. The practical rule is
  simple: read the ticket, then follow the selling lottery's claim instructions. This guide is
  orientation, not legal advice, and it is not a substitute for the lottery that sold your ticket.
</p>

${adSlot("guide-mid")}

<h2>What happens after a ticket expires?</h2>
<p>
  Once the selling lottery's claim deadline passes without a valid claim, the prize is treated as
  unclaimed under that lottery's rules. For multi-state jackpots, the next step is not "the money
  disappears" and it is not "the next advertised jackpot absorbs it." Official materials describe
  a return of shares to the participating lotteries, followed by local use under each
  jurisdiction's law.
</p>
${callout(
  "After the deadline: four stages",
  `<ol>
    <li><b>Deadline passes</b> without a valid claim in the selling jurisdiction.</li>
    <li><b>Prize becomes unclaimed</b> under that lottery's rules.</li>
    <li><b>Participating lotteries receive their shares</b> of an unclaimed multi-state jackpot, based on sales for the draw run.</li>
    <li><b>Local law determines the final use</b> in each jurisdiction (other games, a general fund, education or other beneficiaries, promotions, or otherwise as required by law).</li>
  </ol>`,
  "note",
)}

<h2>An unclaimed jackpot does not simply roll over</h2>
<p>
  Powerball's FAQ is direct: unclaimed prizes are kept by the lottery jurisdiction. If a
  <strong>Grand Prize</strong> goes unclaimed, the money must be returned to all lotteries
  <strong>in proportion to their sales for the draw run</strong>. Those lotteries then distribute
  the money based on their own jurisdiction's laws to other lottery games, to their jurisdiction's
  general fund, or otherwise as required by law.
</p>
<p>
  Mega Millions' FAQ matches the same core idea in its own wording: if a jackpot is not claimed
  within the required time in the selling state or jurisdiction, <strong>each participating lottery
  gets back all the money they contributed (through ticket sales) to the unclaimed jackpot</strong>.
  Each lottery then uses unclaimed prizes for purposes set by lottery legislation in that
  jurisdiction. Examples on the official FAQ include returning money to a prize pool for
  promotions and additional prizes, sending it to beneficiaries such as education and scholarships,
  or using it for multiple purposes.
</p>
<p>
  That is different from an ordinary jackpot roll when <em>no</em> ticket wins. A roll advances
  the prize for the next drawing because nobody hit it. An unclaimed jackpot means a winning
  ticket existed, the claim window closed, and the contributed jackpot funds are returned to the
  lotteries that funded them.
</p>

<h2>Claim deadlines are not the same everywhere</h2>
<p>
  National FAQs give the common range. Individual lotteries write the deadline that applies to a
  specific ticket. The table below is a pair of official examples only. It is not a nationwide
  deadline chart, and it is not legal advice.
</p>
${deadlineTable}
<p>
  California Lottery's claim page states that a draw game ticket must be
  <strong>postmarked or received</strong> by Lottery offices within <strong>180 days</strong> of
  the winning draw date, <strong>except</strong> that Mega Millions and Powerball
  <strong>Jackpots</strong> must be postmarked or received within <strong>one year</strong> from
  the winning draw date.
</p>
<p>
  New York Lottery's How to Claim page states that winning draw game tickets expire
  <strong>one year from the date of the draw</strong>, and its mail guidance reminds players that
  Draw Game prizes must be claimed within one year of the draw date. New York Gaming Commission
  rules likewise provide that no prize claim shall be valid if submitted to the commission after
  one year has elapsed from the draw date, as required by Tax Law section 1614(a). Prize-size
  columns on the New York claim page describe where and how to claim; they do not change the claim
  deadline.
</p>

<h2>A real unclaimed Mega Millions jackpot</h2>
<p>
  Official Mega Millions news has used a concrete historical example. In a December 21, 2024
  jackpot update, Mega Millions noted that the <strong>advertised $68&nbsp;million</strong> prize
  won in New York on December 24, 2002, eventually went unclaimed. In a multi-state game like Mega
  Millions, unclaimed jackpots revert to the participating states based on their contribution to
  sales, and the funds are then distributed as defined by lottery legislation in each jurisdiction.
</p>
<p>
  That case is useful because it separates three ideas: a winning ticket existed, the claim window
  closed without a claim, and the contributed jackpot money returned to the participating
  lotteries rather than simply becoming the next drawing's advertised jackpot.
</p>

<h2>Lost ticket, unclaimed ticket and unclaimed property</h2>
<p>
  People often collapse several different problems into one search box. Keep the labels separate.
</p>
${conceptTable}
<p>
  Mega Millions' FAQ states that Mega Millions and participating lotteries are not responsible for
  lost or stolen tickets, that players should sign the back of the ticket, and that lottery tickets
  are bearer instruments: unless signed, anyone in possession of the ticket can file a prize claim.
  A lost ticket is therefore first a possession and proof problem, not automatically an
  "unclaimed property" listing.
</p>
<p>
  An unclaimed winning ticket is a deadline problem under lottery rules. General unclaimed-property
  programs are a different legal track for other kinds of abandoned assets. This guide does
  <strong>not</strong> send readers to a general unclaimed-property search as a way to recover an
  expired lottery ticket.
</p>

<h2>Does the retailer get the unclaimed prize?</h2>
<p>
  No. Official Powerball and Mega Millions materials describe unclaimed prizes as kept by the
  lottery jurisdiction, with unclaimed jackpot shares returned to participating lotteries according
  to sales contribution. Retailers may earn commissions or other selling incentives under local
  rules, but those incentives are not the same thing as receiving the winning prize that went
  unclaimed. Do not invent a nationwide retailer-bonus rule from this page.
</p>

<h2>A practical ticket-checking routine</h2>
<p>
  If you play at all, a short routine beats relying on memory after a big draw. Lottery Number Lab
  does <strong>not</strong> verify claims. Ticket Match on this site compares numbers against
  published drawing history for education; it is not official claim verification.
</p>
<ol>
  <li>Sign the back of the ticket as soon as you buy it, following the selling lottery's instructions.</li>
  <li>Photograph the front and back, including the draw date, serial information, and any claim deadline printed on the ticket.</li>
  <li>Store the physical ticket somewhere safe until you have checked the official result and, if needed, completed a claim.</li>
  <li>After the drawing, compare your numbers with the selling lottery's official results (or the official Powerball / Mega Millions results), not with a social-media screenshot alone.</li>
  <li>If the ticket appears to win, stop and follow the selling lottery's claim steps for that prize level. Do not mail a ticket without reading the lottery's current mail instructions.</li>
  <li>Watch the claim deadline on the ticket and on the lottery's claim page. California, New York, and every other jurisdiction can differ.</li>
  <li>If you are unsure, contact the lottery that sold the ticket. Do not treat a website tool, including this site, as proof that a prize is owed or that a claim was filed.</li>
</ol>

<h2>What this guide cannot tell you</h2>
<p>
  This page cannot tell you whether any specific ticket is still claimable, whether your state will
  recreate a lost ticket, how a particular jurisdiction spends returned unclaimed funds this year,
  or what tax result would apply to a prize. It does not estimate how often prizes go unclaimed, and
  it does not invent a 50-state deadline table. For a live ticket, the selling lottery is the
  authority.
</p>

<h2>Practical takeaway</h2>
<p>
  Treat the claim deadline as part of owning a ticket. Deadlines generally depend on the lottery
  that sold it. An unclaimed multi-state jackpot is returned to participating lotteries by sales
  share, then handled under local law; it does not simply become the next jackpot. Keep lost
  tickets, unclaimed tickets, and general unclaimed property conceptually separate. If you play,
  keep spend inside an entertainment budget you can lose without harm.
  <a href="../responsible-play.html">Responsible play</a> resources are there if lottery play
  stops feeling optional.
</p>

<h2 id="faq">FAQ</h2>
<dl class="faq-list">
  <dt>How long do I have to claim a Powerball or Mega Millions prize?</dt>
  <dd>
    Claim periods typically range from 90 days to one year from the draw date, depending on the
    lottery that sold the ticket. Check the back of the ticket and the selling lottery's claim
    instructions. This is not legal advice.
  </dd>
  <dt>What happens to an unclaimed Powerball or Mega Millions jackpot?</dt>
  <dd>
    It does not simply roll into the next jackpot. Participating lotteries receive back their
    shares based on sales for that draw run, and each jurisdiction then uses the returned money
    according to its own law.
  </dd>
  <dt>Does an unclaimed jackpot roll over into the next drawing?</dt>
  <dd>
    No. Official Powerball and Mega Millions materials describe returning unclaimed Grand Prize or
    jackpot funds to participating lotteries in proportion to their sales contribution, not rolling
    that unclaimed jackpot into the next advertised jackpot.
  </dd>
  <dt>Are claim deadlines the same in every state?</dt>
  <dd>
    No. Deadlines are set by the selling jurisdiction. Powerball and Mega Millions both describe a
    common range of about 90 days to one year, with important state-level differences such as
    California's 180-day draw-game rule and one-year Mega Millions and Powerball jackpot exception.
  </dd>
  <dt>Can I find an expired lottery ticket through a general unclaimed-property search?</dt>
  <dd>
    Do not treat general unclaimed-property searches as a way to recover an expired lottery ticket.
    An unclaimed winning lottery prize is handled under lottery claim rules. Lost tickets, uncashed
    payments, and general unclaimed property are different concepts.
  </dd>
  <dt>Does the retailer who sold the ticket receive the unclaimed prize?</dt>
  <dd>
    No. Official materials describe unclaimed prizes as kept by the lottery jurisdiction, with
    unclaimed jackpot shares returned to participating lotteries. Retailer commissions or selling
    incentives are separate from the winning prize itself.
  </dd>
  <dt>Does Lottery Number Lab verify claims or confirm that a ticket won?</dt>
  <dd>
    No. Lottery Number Lab does not verify claims. Tools such as Ticket Match are educational
    comparisons against published drawing history, not official claim verification. Confirm winning
    numbers and claim steps with the lottery that sold the ticket.
  </dd>
</dl>

<section class="sources">
  <h2>Sources and methodology</h2>
  <p>
    Claim-window ranges, unclaimed-jackpot share returns, lost-ticket bearer language, California
    postmark-or-received rules, New York one-year draw-game language, and the 2002 New York
    advertised $68&nbsp;million unclaimed Mega Millions example were checked against official
    Powerball, Mega Millions, California Lottery, and New York Lottery materials on September 28,
    2026. This page is informational entertainment, not legal, tax, or claims advice.
  </p>
  <ul>
    <li><a href="https://www.powerball.com/faqs" target="_blank" rel="noopener nofollow">Powerball — FAQs</a> (claim windows typically 90 days to one year; unclaimed prizes kept by the jurisdiction; unclaimed Grand Prize returned in proportion to sales for the draw run; accessed September 28, 2026)</li>
    <li><a href="https://www.megamillions.com/faqs.aspx" target="_blank" rel="noopener nofollow">Mega Millions — FAQs</a> (claim periods 90 days to one year from the draw date; unclaimed jackpot shares returned to participating lotteries; lost/stolen ticket and bearer-instrument language; drawings at 11:00 p.m. ET; accessed September 28, 2026)</li>
    <li><a href="https://www.calottery.com/en/claim-a-prize" target="_blank" rel="noopener nofollow">California Lottery — Claim a Prize</a> (draw game tickets postmarked or received within 180 days; Mega Millions and Powerball Jackpots within one year; accessed September 28, 2026)</li>
    <li><a href="https://nylottery.ny.gov/how-to-claim" target="_blank" rel="noopener nofollow">New York Lottery — How to Claim a Prize</a> (winning draw game tickets expire one year from the date of the draw; Draw Game prizes must be claimed within one year of the draw date; accessed September 28, 2026)</li>
    <li><a href="https://www.megamillions.com/News/2024/Jackpot-Nears-%241-Billion-for-Christmas-Eve-Drawing.aspx" target="_blank" rel="noopener nofollow">Mega Millions — Jackpot Nears $1 Billion for Christmas Eve Drawing</a> (December 21, 2024; advertised $68&nbsp;million New York prize from December 24, 2002 eventually unclaimed; unclaimed jackpots revert by sales contribution; accessed September 28, 2026)</li>
  </ul>
  <p>
    See also <a href="../methodology.html">our methodology and corrections policy</a>.
  </p>
</section>

<h2>Related guides and tools</h2>
<ul>
  <li><a href="what-happens-when-multiple-people-win-the-lottery-jackpot.html">What happens when multiple people win the lottery jackpot?</a> — ticket-level splits are a different question from unclaimed prizes</li>
  <li><a href="../results/index.html">Past winning numbers</a> — published drawing history to compare against a ticket</li>
  <li><a href="../tools/ticket-match-checker.html">Ticket Match</a> — educational number comparison, not official claim verification</li>
  <li><a href="record-jackpots-and-taxes.html">Record jackpots and the tax math winners actually face</a></li>
  <li><a href="expected-value-of-a-lottery-ticket.html">What is the expected value of a lottery ticket?</a></li>
  <li><a href="../responsible-play.html">Responsible play</a></li>
  <li><a href="../methodology.html">Methodology and corrections</a></li>
</ul>
`;
  },
};


/* --------------------------------- 14 ------------------------------------ */

const winnerAnonymity = {
  slug: "can-lottery-winners-stay-anonymous",
  kicker: "Money",
  title: "Can Lottery Winners Stay Anonymous?",
  seoTitle: "Can Lottery Winners Stay Anonymous? State-by-State Rules",
  dek: "Whether a lottery winner can remain anonymous usually depends on where the ticket was sold and claimed. Compare disclosure categories, thresholds, and privacy limits across U.S. jurisdictions.",
  description:
    "Lottery winner anonymity depends on where the ticket was sold. Compare current disclosure rules, prize thresholds and privacy limits by U.S. jurisdiction.",
  published: "2026-09-28",
  updated: "2026-09-28",
  publicationMeta:
    "Winner disclosure rules verified against official lottery and government sources",
  faq: [
    {
      q: "Can lottery winners stay anonymous everywhere?",
      a: "No. Official Powerball guidance says every jurisdiction has its own law. Some require name and city disclosure; some allow anonymity or limited confidentiality; some only delay disclosure. Confirm the selling lottery's rules.",
      plain:
        "No. Official Powerball guidance says every jurisdiction has its own law. Some require name and city disclosure; some allow anonymity or limited confidentiality; some only delay disclosure. Confirm the selling lottery's rules.",
    },
    {
      q: "Does where I live or where I bought the ticket control anonymity?",
      a: "Usually the jurisdiction where the ticket was purchased and claimed controls the claim and disclosure rules. Powerball states prizes must be claimed where the ticket was purchased. Living elsewhere does not automatically import another state's anonymity rule.",
      plain:
        "Usually the jurisdiction where the ticket was purchased and claimed controls the claim and disclosure rules. Powerball states prizes must be claimed where the ticket was purchased. Living elsewhere does not automatically import another state's anonymity rule.",
    },
    {
      q: "Is claiming through a trust or LLC the same as staying anonymous?",
      a: "No. A trust or entity claim is a claim vehicle. It is not the same as a statute that keeps a winner's name confidential, temporary confidentiality, delayed disclosure, or a lottery declining a photo. Some jurisdictions allow entity claims; others reject them for claiming.",
      plain:
        "No. A trust or entity claim is a claim vehicle. It is not the same as a statute that keeps a winner's name confidential, temporary confidentiality, delayed disclosure, or a lottery declining a photo. Some jurisdictions allow entity claims; others reject them for claiming.",
    },
    {
      q: "What is temporary confidentiality?",
      a: "Temporary confidentiality or delayed disclosure means a name may be withheld for a defined period and then becomes disclosable. It is not permanent anonymity. Florida's statute, for example, makes certain large-prize names confidential for 90 days after claim, then the exemption ends.",
      plain:
        "Temporary confidentiality or delayed disclosure means a name may be withheld for a defined period and then becomes disclosable. It is not permanent anonymity. Florida's statute, for example, makes certain large-prize names confidential for 90 days after claim, then the exemption ends.",
    },
    {
      q: "Do Alabama, Alaska, Hawaii, Nevada, and Utah sell Mega Millions or Powerball?",
      a: "No. Official Mega Millions materials describe sales in 45 states plus the District of Columbia and the U.S. Virgin Islands. Powerball also includes Puerto Rico. Those five states have no direct Mega Millions or Powerball sales.",
      plain:
        "No. Official Mega Millions materials describe sales in 45 states plus the District of Columbia and the U.S. Virgin Islands. Powerball also includes Puerto Rico. Those five states have no direct Mega Millions or Powerball sales.",
    },
    {
      q: "Does this guide cover United Kingdom Powerball sales?",
      a: "No. Powerball began United Kingdom sales in 2026, but this guide is limited to U.S. states and U.S. jurisdictions (50 states, the District of Columbia, Puerto Rico, and the U.S. Virgin Islands).",
      plain:
        "No. Powerball began United Kingdom sales in 2026, but this guide is limited to U.S. states and U.S. jurisdictions (50 states, the District of Columbia, Puerto Rico, and the U.S. Virgin Islands).",
    },
    {
      q: "Is this legal advice?",
      a: "No. Lottery Number Lab is informational entertainment. Disclosure statutes and lottery practices change. Confirm current claim and disclosure rules with the lottery that sold the ticket and with qualified counsel. This is not legal, tax, or claims advice.",
      plain:
        "No. Lottery Number Lab is informational entertainment. Disclosure statutes and lottery practices change. Confirm current claim and disclosure rules with the lottery that sold the ticket and with qualified counsel. This is not legal, tax, or claims advice.",
    },
  ],
  body(ctx) {
    const rules = jurisdictionDirectoryRows(WINNER_DISCLOSURE_RULES);
    const counts = disclosureCategoryCounts(rules);
    const sumCounts = (c) => Object.values(c).reduce((a, b) => a + b, 0);
    const salesLabel = (r) => {
      if (r.salesStatus === "no_direct_sales") return "Neither";
      if (r.salesStatus === "powerball_only") return "PB only";
      if (r.megaMillions && r.powerball) return "MM + PB";
      if (r.powerball) return "PB";
      if (r.megaMillions) return "MM";
      return "See notes";
    };
    const keyLimit = (r) => {
      if (r.anonymityType === "official_guidance_not_explicit") {
        return (
          r.importantLimits ||
          "Official guidance reviewed does not state a clear general anonymity or public-disclosure rule — confirm with the lottery before claiming"
        );
      }
      if (r.anonymityType === "unresolved") return "Confirm with the selling lottery before claiming";
      if (r.anonymityType === "no_sales") return "No direct MM/PB ticket sales";
      if (r.threshold) return r.threshold;
      if (r.confidentialityPeriod) return r.confidentialityPeriod;
      if (r.importantLimits) return r.importantLimits;
      if (r.publicName) return r.publicName;
      return "See official source";
    };
    const sourceCell = (r) => {
      if (!r.officialSourceUrl) return "—";
      const title = r.officialSourceTitle || "Official source";
      return `<a href="${r.officialSourceUrl}" target="_blank" rel="noopener nofollow">${title}</a>`;
    };

    const directory = table(
      ["Jurisdiction", "MM/PB", "Disclosure status", "Key condition / limit", "Official source"],
      rules.map((r) => [
        r.jurisdiction,
        salesLabel(r),
        DISCLOSURE_CATEGORY_LABELS[r.anonymityType],
        keyLimit(r),
        sourceCell(r),
      ]),
      {
        className: "table--disclosure",
        caption:
          "All 53 U.S. jurisdictions in this guide (50 states + District of Columbia + Puerto Rico + U.S. Virgin Islands). Alphabetical. Verified " +
          WINNER_DISCLOSURE_VERIFIED_ON +
          " against official lottery and government sources where linked. Where official guidance is not explicit, the directory says so rather than guessing Yes/No.",
      },
    );

    const conceptTable = table(
      ["Concept", "What it usually means", "What it is not"],
      [
        [
          "Anonymous claim",
          "A rule that keeps the winner's identity from public disclosure (often with remaining lottery/IRS knowledge)",
          "A trust claim, a delayed press release, or declining a photo",
        ],
        [
          "Conditional anonymity",
          "Anonymity available only above a prize threshold, for certain games, or after a written election",
          "Automatic anonymity for every prize amount",
        ],
        [
          "Temporary confidentiality / delayed disclosure",
          "A defined holdback period after which the name becomes disclosable",
          "Permanent anonymity",
        ],
        [
          "Limited public info",
          "Some fields public (for example city or prize) while name is withheld, or name shortened",
          "Full secrecy of all claim facts",
        ],
        [
          "Trust / LLC / entity claim",
          "A claim vehicle; some lotteries publish the entity name while beneficial owners may or may not stay private",
          "A synonym for statutory anonymity",
        ],
        [
          "Name omitted from press release / no photo",
          "Publicity practice by the lottery",
          "A guarantee against public-records disclosure",
        ],
      ],
      {
        caption:
          "Do not treat these labels as synonyms. The directory uses primary disclosure categories, not a Yes/No anonymity column.",
      },
    );

    const conditionalRows = rules.filter((r) => r.anonymityType === "conditional");
    const temporaryRows = rules.filter((r) => r.anonymityType === "temporary");
    const trustRows = rules.filter((r) => r.trustOrEntityClaim);

    const conditionalTable = table(
      ["Jurisdiction", "Threshold / condition", "Important limit", "Official source"],
      conditionalRows.map((r) => [
        r.jurisdiction,
        r.threshold || "—",
        r.importantLimits || r.confidentialityPeriod || "—",
        sourceCell(r),
      ]),
      { caption: "Conditional anonymity jurisdictions (must show conditions)." },
    );

    const temporaryTable = table(
      ["Jurisdiction", "Period", "What becomes public later", "Official source"],
      temporaryRows.map((r) => [
        r.jurisdiction,
        r.confidentialityPeriod || "—",
        r.publicName || "—",
        sourceCell(r),
      ]),
      { caption: "Temporary confidentiality / delayed disclosure — not permanent anonymity." },
    );

    const trustTable = table(
      ["Jurisdiction", "Trust / entity note", "Disclosure category"],
      trustRows.map((r) => [
        r.jurisdiction,
        r.trustOrEntityClaim,
        DISCLOSURE_CATEGORY_LABELS[r.anonymityType],
      ]),
      {
        caption:
          "Jurisdictions where official materials discuss trusts/entities. Trust claim ≠ anonymity.",
      },
    );

    const guidanceNotExplicitList = rules
      .filter((r) => r.anonymityType === "official_guidance_not_explicit")
      .map((r) => r.jurisdiction)
      .join("; ");

    const countCallout = callout(
      "Classification totals",
      `<ul>
  <li>Broad anonymity available: <b>${counts.broad}</b></li>
  <li>Conditional anonymity: <b>${counts.conditional}</b></li>
  <li>Temporary confidentiality / delayed disclosure: <b>${counts.temporary}</b></li>
  <li>Public disclosure generally required: <b>${counts.public}</b></li>
  <li>No direct MM/PB sales: <b>${counts.no_sales}</b></li>
  <li>Official guidance not explicit: <b>${counts.official_guidance_not_explicit}</b></li>
</ul>
<p>These ${sumCounts(counts)} jurisdictions are the full directory. Official guidance not explicit means the materials reviewed did not state a clear general rule. It is not a finding that anonymity is allowed or that disclosure is required.</p>`,
      "note",
    );

    return `
<p class="lede">
  Whether a lottery winner can remain anonymous usually depends on the jurisdiction where the
  ticket was purchased and claimed, not simply where the winner lives. Official Powerball guidance
  states that prizes must be claimed in the jurisdiction where the winning ticket was purchased,
  and that every jurisdiction has its own law on winners remaining anonymous.
</p>

${callout(
  "United Kingdom note",
  "<p>Powerball began United Kingdom sales in 2026, but this guide is limited to U.S. states and U.S. jurisdictions (50 states, the District of Columbia, Puerto Rico, and the U.S. Virgin Islands). The United Kingdom is not in the directory below.</p>",
  "note",
)}

${countCallout}

<h2>1. Claim where the ticket was sold</h2>
<p>
  Multi-state jackpot games are sold by individual lotteries. Official Powerball FAQs state that
  prizes must be claimed in the jurisdiction where the winning ticket was purchased. Mega Millions
  materials likewise say winning tickets must be redeemed in the state or jurisdiction where they
  were purchased. Disclosure and anonymity rules follow that selling jurisdiction's law and lottery
  practice — not a single national anonymity rule.
</p>
<p>
  See also
  <a href="what-happens-to-unclaimed-lottery-prizes.html">what happens to unclaimed lottery prizes</a>
  and
  <a href="what-happens-when-multiple-people-win-the-lottery-jackpot.html">what happens when multiple people win a jackpot</a>
  for related claim mechanics.
</p>

<h2>2. What anonymity is not</h2>
<p>
  Public discussion often collapses different ideas into one word: anonymous. Official materials
  and statutes distinguish claim privacy, public-records rules, publicity practices, and claim
  vehicles. This guide keeps those labels separate.
</p>
${conceptTable}

<h2>3. How to read the disclosure categories</h2>
<p>
  The directory uses six primary categories. It is
  <strong>not</strong> a Yes/No anonymity table.
</p>
<ul>
  <li><b>Broad anonymity available</b> — Official materials support withholding the winner's name from public disclosure without a high prize threshold (limits may still apply).</li>
  <li><b>Conditional anonymity</b> — Anonymity or confidentiality is available only under stated conditions (threshold, game type, written election, FOIA caveats).</li>
  <li><b>Temporary confidentiality / delayed disclosure</b> — A holdback period, after which disclosure is generally required. Not permanent anonymity.</li>
  <li><b>Public disclosure generally required</b> — Name and/or city are generally public (sometimes with limited field redactions or safety exceptions).</li>
  <li><b>No direct MM/PB sales</b> — No state lottery sells Mega Millions or Powerball tickets.</li>
  <li><b>Official guidance not explicit</b> — Official materials reviewed did not provide a clear general anonymity option or a clear public-disclosure rule. That is not a finding that anonymity is allowed, and it is not a finding that disclosure is required. Confirm with the selling lottery before claiming.</li>
</ul>

<p>
  A missing clear rule is not the same as anonymity being allowed, and it is not the same as
  disclosure being required. If the directory says official guidance is not explicit, confirm
  current claim and publicity rules with the lottery that sold the ticket before you claim.
</p>

<h2>4. Where Mega Millions and Powerball are sold</h2>
<p>
  Official Mega Millions materials describe play in 45 states plus the District of Columbia and the
  U.S. Virgin Islands (47 localities). Official Powerball and participating-lottery materials also
  include Puerto Rico for Powerball. Alabama, Alaska, Hawaii, Nevada, and Utah have no direct
  Mega Millions or Powerball sales. Puerto Rico is Powerball-only in this directory; Mega Millions
  is not listed for Puerto Rico on the official Where to Play page.
</p>

<h2>5. Broad anonymity (where confirmed)</h2>
<p>
  In some jurisdictions, official lottery FAQs or statutes support keeping a winner's name from
  public disclosure without a high dollar threshold. Even then, the lottery typically must still
  know the person who purchased the ticket for eligibility and tax reporting, and some claim facts
  (city, prize amount, retailer) may remain public.
</p>
<p>
  Confirmed broad-anonymity examples in this research set include Delaware, Kansas, Maryland,
  Mississippi, Missouri, Montana, New Jersey, North Dakota, Oregon, South Carolina, and Wyoming — each with its own
  wording and limits in the directory.
</p>

<h2>6. Conditional anonymity: thresholds and elections</h2>
<p>
  Conditional rules require a prize threshold, a written request, a game-type limit, or similar
  conditions. Threshold phrasing matters: "over," "at least," "greater than," and "equal to or
  exceeding" are not interchangeable.
</p>
${conditionalTable}

<h2>7. Temporary confidentiality is not anonymity</h2>
<p>
  A delayed-disclosure statute can withhold a name for a fixed period and then release it. That is
  category temporary — not broad anonymity.
</p>
${temporaryTable}

<h2>8. Public disclosure, photos, and trust or LLC claims</h2>
<p>
  Where public disclosure is generally required, official materials may still withhold street
  address or telephone numbers, limit photos, or discuss trusts. Those practices are not synonyms
  for anonymity. California's Winner's Handbook, for example, states that a trust cannot claim a
  prize and that the winner's name remains public. Ohio materials treat individual claimant names
  as public records while describing trust-claim documentation rules separately.
</p>
${trustTable}
<p>
  For cash-versus-annuity choice mechanics that can interact with disclosure timing in some
  statutes (for example Texas installment rules), see
  <a href="record-jackpots-and-taxes.html">record jackpots and taxes</a>.
</p>

<h2>9. Directory of all 53 jurisdictions</h2>
<p>
  Alphabetical directory. Jump groups are plain HTML details elements — no JavaScript filters. Where official guidance is not explicit, the row says so and asks you to confirm with that lottery before claiming.
</p>
${
  counts.official_guidance_not_explicit
    ? callout(
        "Official guidance not explicit",
        `<p>For <b>${guidanceNotExplicitList}</b>, materials reviewed did not state a general winner-anonymity option or a clear public-disclosure rule. Silence is not permission to stay anonymous, and silence is not proof that names must be published. Confirm with Puerto Rico’s lottery authority before claiming.</p>`,
        "note",
      )
    : ""
}
<details open>
  <summary>Full 53-jurisdiction directory</summary>
  ${directory}
</details>

<h2>Practical takeaway</h2>
<p>
  Start with the selling lottery's claim and disclosure rules, not a national Yes/No list. Separate
  anonymity, temporary confidentiality, limited public fields, publicity practices, and trust claims.
  Confirm thresholds and periods from the official source linked in the directory. If you play,
  keep spend inside an entertainment budget you can lose without harm —
  <a href="../responsible-play.html">responsible play</a> resources are available if lottery play
  stops feeling optional. Past results and odds context live in
  <a href="../results/index.html">past numbers</a> and
  <a href="../methodology.html">methodology</a>.
</p>

<h2 id="faq">FAQ</h2>
<dl class="faq-list">
  <dt>Can lottery winners stay anonymous everywhere?</dt>
  <dd>
    No. Official Powerball guidance says every jurisdiction has its own law. Some require name and
    city disclosure; some allow anonymity or limited confidentiality; some only delay disclosure.
    Confirm the selling lottery's rules.
  </dd>
  <dt>Does where I live or where I bought the ticket control anonymity?</dt>
  <dd>
    Usually the jurisdiction where the ticket was purchased and claimed controls the claim and
    disclosure rules. Powerball states prizes must be claimed where the ticket was purchased.
    Living elsewhere does not automatically import another state's anonymity rule.
  </dd>
  <dt>Is claiming through a trust or LLC the same as staying anonymous?</dt>
  <dd>
    No. A trust or entity claim is a claim vehicle. It is not the same as a statute that keeps a
    winner's name confidential, temporary confidentiality, delayed disclosure, or a lottery
    declining a photo. Some jurisdictions allow entity claims; others reject them for claiming.
  </dd>
  <dt>What is temporary confidentiality?</dt>
  <dd>
    Temporary confidentiality or delayed disclosure means a name may be withheld for a defined
    period and then becomes disclosable. It is not permanent anonymity. Florida's statute, for
    example, makes certain large-prize names confidential for 90 days after claim, then the
    exemption ends.
  </dd>
  <dt>Do Alabama, Alaska, Hawaii, Nevada, and Utah sell Mega Millions or Powerball?</dt>
  <dd>
    No. Official Mega Millions materials describe sales in 45 states plus the District of Columbia
    and the U.S. Virgin Islands. Powerball also includes Puerto Rico. Those five states have no
    direct Mega Millions or Powerball sales.
  </dd>
  <dt>Does this guide cover United Kingdom Powerball sales?</dt>
  <dd>
    No. Powerball began United Kingdom sales in 2026, but this guide is limited to U.S. states and
    U.S. jurisdictions (50 states, the District of Columbia, Puerto Rico, and the U.S. Virgin
    Islands).
  </dd>
  <dt>Is this legal advice?</dt>
  <dd>
    No. Lottery Number Lab is informational entertainment. Disclosure statutes and lottery practices
    change. Confirm current claim and disclosure rules with the lottery that sold the ticket and
    with qualified counsel. This is not legal, tax, or claims advice.
  </dd>
</dl>

<section class="sources">
  <h2>Sources and methodology</h2>
  <p>
    Disclosure categories, thresholds, temporary periods, sales availability, and concept
    distinctions were checked against official Powerball and Mega Millions FAQs plus jurisdiction
    statutes, administrative codes, and official lottery claim/FAQ pages linked in the directory.
    Verification date: ${WINNER_DISCLOSURE_VERIFIED_ON}. Where official guidance was not explicit, categories were not filled from blogs, SEO lists, Wikipedia, or news roundups. This page is informational entertainment, not
    legal, tax, or claims advice.
  </p>
  <ul>
    <li><a href="https://www.powerball.com/faqs" target="_blank" rel="noopener nofollow">Powerball — FAQs</a> (claim where purchased; anonymity varies by jurisdiction; UK sales note; accessed September 28, 2026)</li>
    <li><a href="https://www.megamillions.com/faqs.aspx" target="_blank" rel="noopener nofollow">Mega Millions — FAQs</a> (redeem where purchased; public disclosure laws vary; accessed September 28, 2026)</li>
    <li><a href="https://www.megamillions.com/where-to-play" target="_blank" rel="noopener nofollow">Mega Millions — Where to Play</a> (45 states + DC + U.S. Virgin Islands; accessed September 28, 2026)</li>
    <li>Jurisdiction-specific statutes and lottery pages linked in the directory table (verified September 28, 2026)</li>
  </ul>
  <p>
    See also <a href="../methodology.html">our methodology and corrections policy</a>.
  </p>
</section>
`;
  },
};

export const GUIDES = [
oddsCompared,
  independentTrials,
  hotCold,
  winningShapes,
  expectedValue,
  recordJackpots,
  ruleChange2015,
  megaMillions2025,
  oddsMath,
  moreTicketsOdds,
  sharedJackpot,
  quickPickVsManual,
  unclaimedPrizes,
  winnerAnonymity,
];
