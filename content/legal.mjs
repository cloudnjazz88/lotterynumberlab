/* About, privacy policy, terms & disclaimer, responsible play. */

import { SITE, CORE_DISCLAIMER, num, oneIn, dateLong, table, callout } from "./site.mjs";

export function aboutPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;

  return `      <section class="panel prose prose--page">
        <p class="page-kicker">About</p>
        <h1>What this site is, and who runs it</h1>
        <p class="lede">
          ${SITE.name} is an independent statistics project about the two national US lottery
          games, Mega Millions and Powerball. It publishes the probability mathematics behind
          both games, measures the complete drawing record of each, and keeps an archive of
          past winning numbers. A dashboard can sample combinations from that history; that
          tool is optional and does not sell tickets, take wagers, or promise a win.
        </p>

        <h2>Who runs this</h2>
        ${
          SITE.operatorName
            ? `<p>
          ${SITE.operatorName} edits ${SITE.name}${SITE.location ? `, based in ${SITE.location}` : ""}.
          Editorial decisions — what to publish, which eras to analyse, how to word the
          disclaimers — are made here, not by an advertiser or a lottery.
        </p>`
            : `<p>
          This site is independently edited${SITE.location ? ` from ${SITE.location}` : ""}.
          Before the site is submitted to an advertising network, a named editor will be listed
          in this paragraph. Until then, the email below is the public contact for corrections,
          privacy requests and advertising questions.
        </p>`
        }
        <p class="contact-line">
          <a class="text-link" href="mailto:${SITE.email}">${SITE.email}</a>
        </p>
        <p class="note">
          We usually reply within a few business days. We cannot help with claiming prizes,
          checking tickets, or anything requiring access to lottery systems — only your state
          lottery can do that.
        </p>

        <h2>Editorial approach</h2>
        <p>
          Every number published here is derived, not copied. The odds tables are computed from
          the official ball matrices using the standard combination formula, and they reproduce
          the prize charts published by both lotteries exactly. The statistics — frequencies,
          dry spells, sum distributions, odd/even splits — are computed from
          ${num(mm.history.count)} Mega Millions drawings and ${num(pb.history.count)} Powerball
          drawings, taken from an official open-data feed. When we cannot verify something, we
          leave it out.
        </p>
        <p>
          We also try to be unusually blunt about what statistics can and cannot do for a
          lottery player. Drawings are independent events; no analysis of past results improves
          anyone's odds. Our own generator is a way to explore the data and to produce lines
          that look like real winning combinations — nothing more. Anywhere that distinction
          could be misread, we state it again.
        </p>

        <h2>Where the data comes from</h2>
        ${table(
          ["Source", "Used for"],
          [
            [
              `<a href="https://data.ny.gov/d/5xaw-6ayf" target="_blank" rel="noopener">New York State Open Data — Mega Millions winning numbers</a>`,
              `${num(mm.history.count)} drawings from ${dateLong(mm.history.firstDraw)} onward`,
            ],
            [
              `<a href="https://data.ny.gov/d/d6yy-54nr" target="_blank" rel="noopener">New York State Open Data — Powerball winning numbers</a>`,
              `${num(pb.history.count)} drawings from ${dateLong(pb.history.firstDraw)} onward`,
            ],
            [
              `<a href="https://www.megamillions.com/" target="_blank" rel="noopener">megamillions.com</a>
               and <a href="https://www.powerball.com/" target="_blank" rel="noopener">powerball.com</a>`,
              "Game rules, prize structures, draw schedules and official odds statements",
            ],
          ],
        )}
        <p>
          Results are cached in this site's own snapshot and can be refreshed live from the
          open-data feed using the button on either generator page. Even so, an open-data feed
          can lag or contain errors: <strong>never claim a prize based on numbers shown
          here</strong>. Verify with your state lottery or the official game website.
        </p>

        <h2>Independence</h2>
        <p>
          This site is not affiliated with, endorsed by, sponsored by or connected to the Mega
          Millions Consortium, the Multi-State Lottery Association (MUSL), any state lottery, or
          any lottery courier or ticket reseller. Game names and logos belong to their
          respective owners and are used only to describe the games discussed.
        </p>

        <h2>How the site is funded</h2>
        <p>
          Pages may display third-party advertising, which is how the hosting and data costs are
          covered. Advertising is served by an external network and does not influence what we
          publish; we do not accept payment for coverage, and we do not run affiliate links to
          ticket sellers or "lottery system" products. See our
          <a href="privacy-policy.html">privacy policy</a> for what advertising means for your
          data.
        </p>

        <h2>Corrections and contact</h2>
        <p>
          If you find a figure you believe is wrong, please tell us — with a source if you have
          one — and we will check it against
          <a href="methodology.html">the methodology</a> and correct the page. The same address
          handles privacy requests, advertising questions and general feedback.
        </p>
        <p class="contact-line">
          <a class="text-link" href="mailto:${SITE.email}">${SITE.email}</a>
        </p>
      </section>
`;
}

export function privacyPage() {
  return `      <section class="panel prose prose--page">
        <p class="page-kicker">Legal</p>
        <h1>Privacy policy</h1>
        <p class="lede">
          Short version: we do not ask for your name, we do not have accounts, and we cannot
          identify you. Your generator settings stay in your own browser. Third-party
          advertising and analytics, where present, set their own cookies — details and opt-outs
          are below.
        </p>
        <p class="note">Last updated: ${dateLong("2026-08-24")}.</p>

        <h3>1. Information we collect directly</h3>
        <p>
          <strong>None that identifies you.</strong> This site has no sign-up, no login, no
          contact form and no newsletter. We do not ask for your name, address, date of birth,
          payment details or lottery numbers. If you email us, we hold that email — and nothing
          else — for as long as it takes to answer you.
        </p>

        <h3>2. Information stored on your device</h3>
        <p>
          The generator remembers your own settings (analysis window, weighting preset, slider
          values and filter toggles) using your browser's <code>localStorage</code>. That data
          never leaves your device, is not readable by us, and contains nothing personal. Clear
          your site data at any time and it is gone permanently; the site continues to work with
          default settings.
        </p>

        <h3>3. Server logs</h3>
        <p>
          Like effectively every website, our hosting provider records standard technical request
          logs — IP address, timestamp, page requested, referring page, browser user agent.
          These are used for security and to keep the site running, and are retained only for as
          long as our host's normal log rotation.
        </p>

        <h3>4. Third-party advertising</h3>
        <p>
          Pages on this site may show advertising supplied by Google and its partners. Ad
          networks use cookies and similar technologies to serve and measure ads, and may use
          them to show ads based on your prior visits to this or other websites.
        </p>
        <ul>
          <li>
            Google's use of advertising cookies enables it and its partners to serve ads based
            on your visits to this site and/or other sites on the internet.
          </li>
          <li>
            You can opt out of personalised advertising at
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener nofollow"
              >Google Ads Settings</a
            >, or opt out of third-party vendor cookies for personalised advertising at
            <a href="https://www.aboutads.info/" target="_blank" rel="noopener nofollow"
              >aboutads.info</a
            >.
          </li>
          <li>
            More about how Google uses data from sites that use its services:
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener nofollow"
              >policies.google.com/technologies/partner-sites</a
            >.
          </li>
          <li>
            Where required by law, visitors in the European Economic Area, the United Kingdom and
            Switzerland are shown a consent message before personalised advertising or
            non-essential cookies are used, and can withdraw or change that consent at any time
            through the same message.
          </li>
        </ul>

        <h3>5. Analytics</h3>
        <p>
          This site uses Google Analytics 4 to record page views and general traffic patterns —
          never lottery selections, and never anything that identifies you by name. Google may
          set cookies or use similar technology for that measurement. We do not sell, rent or
          trade data about visitors to anyone, for any purpose.
        </p>
        <p>
          You can opt out of Google Analytics with the
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener nofollow"
            >Google Analytics opt-out browser add-on</a
          >, and you can review how Google uses data from sites that use its services at
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener nofollow"
            >policies.google.com/technologies/partner-sites</a
          >.
        </p>

        <h3>6. External links and data sources</h3>
        <p>
          We link to state lottery sites, official game sites and public open-data portals. Those
          sites have their own privacy policies, and this one does not apply to them. Drawing
          results are fetched from the New York State open-data portal; when you press the "fetch
          latest results" button, your browser contacts that portal directly, and their terms and
          privacy policy govern that request.
        </p>

        <h3>7. Children</h3>
        <p>
          This site concerns lottery games that are legally restricted to adults. It is not
          directed at children, and we do not knowingly collect information from anyone under 18.
          If you believe a child has sent us information, email us and we will delete it.
        </p>

        <h3>8. Your rights</h3>
        <p>
          Depending on where you live, you may have the right to access, correct or delete
          personal data a site holds about you, to object to processing, or to opt out of the
          "sale" or "sharing" of personal information. Because we hold no account data, the
          practical steps are: clear your browser storage for this site, use the advertising
          opt-outs linked above, and email us if you have sent us anything you want removed.
        </p>

        <h3>9. Changes</h3>
        <p>
          If this policy changes materially we will update the date at the top of the page.
          Continuing to use the site after a change means you accept the revised policy.
        </p>

        <h3>10. Contact</h3>
        <p class="contact-line">
          <a class="text-link" href="mailto:${SITE.email}">${SITE.email}</a>
        </p>
      </section>
`;
}

export function termsPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;

  return `      <section class="panel prose prose--page">
        <p class="page-kicker">Legal</p>
        <h1>Terms of use &amp; full disclaimer</h1>

        ${callout(
          "The disclaimer that matters most",
          `<p class="disclaimer-text">${CORE_DISCLAIMER}</p>`,
          "warn",
        )}

        <p class="note">Last updated: ${dateLong("2026-08-24")}.</p>

        <h3>1. Entertainment and information only</h3>
        <p>
          Everything on this site — the generated numbers, the statistics, the charts, the
          guides — is provided for entertainment and general information. It is not gambling
          advice, financial advice, tax advice or legal advice, and it must not be relied upon
          for any decision about money. If a decision matters, consult a qualified professional.
        </p>

        <h3>2. No prediction, no guarantee, no system</h3>
        <p>
          Lottery drawings are independent random events. Nothing on this site can predict a
          drawing, improve your probability of winning, or identify numbers that are "due". The
          jackpot odds are fixed by the rules of each game at
          ${oneIn(mm.config.jackpotOdds)} for ${mm.config.name} and
          ${oneIn(pb.config.jackpotOdds)} for ${pb.config.name}, and they are the same for a
          combination produced by this site as for any other combination. We make no
          representation that using this site will produce any winnings whatsoever.
        </p>

        <h3>3. No affiliation with any lottery</h3>
        <p>
          This is an independent project. It is not affiliated with, endorsed by, sponsored by,
          authorised by or connected to the Mega Millions Consortium, the Multi-State Lottery
          Association (MUSL), any state or provincial lottery, or any ticket courier or reseller.
          "Mega Millions", "Powerball", "Mega Ball", "Megaplier" and "Power Play" are trademarks
          of their respective owners and are used here only descriptively, to identify the games
          being discussed.
        </p>

        <h3>4. We do not sell tickets or pay prizes</h3>
        <p>
          No part of this site sells, brokers or facilitates the purchase of a lottery ticket,
          and we never handle money or prizes. A set of numbers generated here has no value and
          confers no entitlement of any kind. To play, you must buy a ticket from an authorised
          retailer or official channel in a jurisdiction where doing so is legal for you.
        </p>

        <h3>5. Accuracy of results and data</h3>
        <p>
          Drawing results are taken from a public open-data feed and may be delayed, incomplete
          or incorrect. Prize structures, odds statements and schedules can change. Nothing here
          is an official record.
          <strong>Never claim a prize, discard a ticket, or make any decision based on numbers
          shown on this site.</strong> Only the official results published by the relevant
          lottery are authoritative, and only your state lottery can validate a ticket.
        </p>

        <h3>6. Eligibility and legality</h3>
        <p>
          Lottery play is restricted by age and geography. In the United States you must
          generally be at least 18 — 21 in some states — and lottery products are not available
          in every jurisdiction. It is your responsibility to know and obey the law that applies
          to you. If lottery participation is illegal where you are, use this site only as
          reading material.
        </p>

        <h3>7. Play within your means</h3>
        <p>
          Do not spend money on lottery tickets that you cannot comfortably afford to lose, and
          do not increase your spending in an attempt to recover losses. Excessive lottery
          purchasing is a recognised form of problem gambling. Please read our
          <a href="responsible-play.html">responsible play page</a>; if gambling has stopped
          being fun, help is available at 1-800-GAMBLER and through the
          <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener nofollow"
            >National Council on Problem Gambling</a
          >.
        </p>

        <h3>8. Availability</h3>
        <p>
          The site is provided "as is" and "as available", without warranties of any kind, express
          or implied, including fitness for a particular purpose. We do not promise that it will
          be uninterrupted, error-free, or that any statistic will be current.
        </p>

        <h3>9. Limitation of liability</h3>
        <p>
          To the fullest extent permitted by law, we accept no liability for any loss or damage —
          including money spent on lottery tickets, prizes not won, prizes shared, or decisions
          taken in reliance on anything published here — arising from your use of this site or
          any site linked from it. Some jurisdictions do not allow certain exclusions, in which
          case our liability is limited to the minimum permitted by law.
        </p>

        <h3>10. Intellectual property</h3>
        <p>
          The text, analysis and code of this site belong to its authors. You are welcome to
          quote a figure or a paragraph with a link back; wholesale republication is not
          permitted. Drawing data is public information from the New York State Open Data portal.
        </p>

        <h3>11. Changes to these terms</h3>
        <p>
          These terms may be updated at any time; the date above shows the last revision.
          Continued use of the site constitutes acceptance of the current version.
        </p>

        <h3>12. Contact</h3>
        <p class="contact-line">
          <a class="text-link" href="mailto:${SITE.email}">${SITE.email}</a>
        </p>
      </section>
`;
}

export function responsiblePage(ctx) {
  const pb = ctx.pb;

  return `      <section class="panel prose prose--page">
        <p class="page-kicker">Play safely</p>
        <h1>Responsible play</h1>
        <p class="lede">
          A lottery ticket is a purchase, not an investment. At
          ${oneIn(pb.config.jackpotOdds)} for a jackpot, the honest way to think about the price
          is as the cost of a few days of anticipation. This page exists because a site that
          publishes number generators has an obligation to say that clearly.
        </p>

        <h3>Four rules that keep it harmless</h3>
        <ul>
          <li>
            <b>Set the amount before you play, not after.</b> Decide what the entertainment is
            worth to you per week, and treat it like a cinema ticket: once it is spent, it is
            spent.
          </li>
          <li>
            <b>Never chase.</b> Increasing your spending to recover past losses is the single
            most reliable path from a hobby to a problem. Previous drawings do not owe you
            anything.
          </li>
          <li>
            <b>Never borrow to play,</b> and never use money committed to rent, food, bills,
            medicine or debt repayment.
          </li>
          <li>
            <b>Expect to lose.</b> Overall odds of winning <em>any</em> prize are about 1 in 23
            to 1 in 25, and most of those wins are a few dollars. A losing ticket is the normal
            outcome, not bad luck.
          </li>
        </ul>

        ${callout(
          "Warning signs",
          `<ul>
            <li>Spending more than you planned, or more than you can comfortably lose.</li>
            <li>Buying tickets to escape stress, boredom, loneliness or low mood.</li>
            <li>Hiding how much you spend from people close to you.</li>
            <li>Borrowing money, selling things, or using bill money to buy tickets.</li>
            <li>Feeling you must keep playing "your" numbers or you will miss out.</li>
            <li>Believing a system, a hot number or a due number will eventually pay off.</li>
          </ul>
          <p>If more than one of these sounds familiar, it is worth talking to someone
          today.</p>`,
          "warn",
        )}

        <h3>Where to get help</h3>
        ${table(
          ["Service", "Contact", "Notes"],
          [
            [
              "National Problem Gambling Helpline (US)",
              "<b>1-800-522-4700</b> — call or text",
              "Free, confidential, 24/7, all 50 states",
            ],
            [
              "1-800-GAMBLER",
              "<b>1-800-426-2537</b>",
              "The number printed on most US lottery materials",
            ],
            [
              "National Council on Problem Gambling",
              `<a href="https://www.ncpgambling.org/" target="_blank" rel="noopener nofollow">ncpgambling.org</a>`,
              "Screening tools, treatment finder, family resources",
            ],
            [
              "Gamblers Anonymous",
              `<a href="https://www.gamblersanonymous.org/" target="_blank" rel="noopener nofollow">gamblersanonymous.org</a>`,
              "Local and online meetings",
            ],
            [
              "Gam-Anon",
              `<a href="https://www.gam-anon.org/" target="_blank" rel="noopener nofollow">gam-anon.org</a>`,
              "Support for family and friends",
            ],
          ],
        )}
        <p>
          Every US state lottery also runs a self-exclusion or voluntary-exclusion programme and
          publishes local helpline numbers on its website. Outside the United States, search for
          your national gambling helpline — most countries have one, and they are free.
        </p>

        <h3>Age and legality</h3>
        <p>
          You must be at least 18 to buy a lottery ticket in most US states, and 21 in some.
          Lottery play is illegal in a handful of states and in many countries. Nothing on this
          site is an invitation to gamble where you are not legally allowed to.
        </p>

        <h3>What we deliberately do not do</h3>
        <ul>
          <li>We do not sell tickets, subscriptions, syndicate shares or "systems".</li>
          <li>We do not claim any method improves your odds — because none does.</li>
          <li>We do not run affiliate links to ticket sellers or gambling operators.</li>
          <li>
            We do not publish "guaranteed" numbers, and we say plainly on every generator page
            that the output is for entertainment.
          </li>
        </ul>
        <p class="disclaimer-text">${CORE_DISCLAIMER}</p>
      </section>
`;
}
