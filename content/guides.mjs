/**
 * Long-form guides. Every number is interpolated from the computed context so
 * the prose cannot drift away from the data or the published game rules.
 */

import { num, pct, oneIn, money, table, callout, dateLong, adSlot, sourceList } from "./site.mjs";

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
];
