# DECISIONS

Log of deviations from SPEC.md / CLAUDE.md and of choices SPEC leaves open. Newest first.

## 2026-10-12 — Staff to 10, limit note, remembered sections, tooltips, method page (Ricardo)

- **Capacity to 10 people:** same curve (20 × people^0.585), ceiling moved from 45 orders/h to "stops growing at 10 people" (77 orders/h). Wages still grow linearly, so extra staff eventually lowers profit. Badge: "suggested (capped at 10 people)". (My proposal table said 67 for 8 people; the correct rounded value is 68.)
- **Limit note** (Sales card) replaces "Room to grow": limited scenario = ≥ 5% of customers turned away; note when ≥ 10% of scenarios are limited; missed orders/sales are medians within those scenarios. Only serving capacity can bind — busy hours are drawn within opening hours (template limit), so no busy-hours note.
- **Section memory:** sessionStorage per tab, not in the link (layout is personal, numbers are shareable). **Restart** replaces "Reset to defaults"; it also resets the seed and asks for confirmation.
- **Input cards collapsible** with a one-line summary. **Sticky results bar removed** on all screens (Ricardo).
- **Tooltips:** fixed "Effect on your results" text per input (option a; a live "+10% → €X" was rejected — misleading for prices, since customers don't react to price in the model). New tips: opening hours, VAT on drinks, card fees (now states "we assume everyone pays by card"), limits, linked estimates, seed, Profit / Sales / Break-even cards.
- **Method page** as a second Vite entry (`method.html`), worked example from the default numbers (option chosen by Ricardo), computed by the engine so it can't drift. Long-form prose lives in `MethodPage.tsx` rather than `copy.ts` (deviation from "copy.ts holds all UI text": it is an article, not UI strings); short UI strings for it are in `copy.method`. "Back to the simulator" returns via browser history so the user's numbers are kept. The no-jargon rule (CLAUDE.md decision 7) still holds on the main page; the method page names and explains terms like "Monte Carlo", "metalog" and "copula" because that is its purpose (Ricardo asked for it).

## 2026-10-11 — Expandable sections in results (Ricardo)

- Detail behind closed-by-default expandables so each card leads with its headline: new "More about your sales"; cost line items; "What it would take"; investor chances. One shared `Expand` component and style (also used by "See all 10,000 scenarios" and the stress table).
- **"What matters most" folded into the Break-even card** (expandable); the separate card is gone. Trade-off: it is less visible to first-time users and no longer a standalone screenshot. The "Start here" tip stays inside.
- Investor dropdowns start at **€1** (Ricardo: "losing / earning €1 or more" reads better than €0). The first option is a fixed €1 (template `minEuro`), the others stay % of the stake. The fixed "Chance of losing any money" row was removed; "losing €1 or more" (default) is practically the same number.
- **"What matters most" opens by default** (Ricardo: ok) — it answers a core question ("what to research next"), so it should not depend on a click.
- Sales detail (`salesDetail`) re-runs the day model on the stored scenarios (no new randomness); `DayResult` gained busy/quiet orders and food/drink sales.
- Old links: a link that relied on the previous default loss threshold (20%) now opens with €0. Acceptable — no users yet.

## 2026-10-11 — "For investors" card (Ricardo)

- Investor co-funds one market day; result shared **in proportion to their part of the day's total costs incl. wages** (option a). Return % = profit ÷ costs per scenario, so one input (the amount) is enough; amounts above a typical day's costs are capped ("they fund the whole day").
- Framed as **a typical market day** (SPEC §8): the footnote says it is not a guarantee. Single-day swings (weather etc.) are not modelled, so a specific day is riskier than shown.
- Thresholds via **dropdowns** (gain 5/10/20/50%, loss 10/20/50%; defaults 10% and 20%); **€ first, % in brackets**; gains and losses in separate green/red panels. "Chance of losing any money" repeats the Profit card on purpose — investors read this card on its own.
- Engine: `investorOutlook` (pure, tested); `SimulationResult` now also returns per-scenario `dailyCosts`. Choice saved in the link (`i`).

## 2026-10-11 — Per weekend day only; Phase 4 dropped (Ricardo)

- The app stays **per weekend day**: no month/year figures, ramp-up, monthly fixed costs, one-off setup costs or payback. SPEC §7 and the payback acceptance test removed; CLAUDE.md key decisions 4 and 6 rewritten; Phase 4 struck from the plan.
- Trade-off noted: investors' "how much do you need, and when do you earn it back?" is not answered by the app. Option logged under Later.
- Remaining planned work: PNG card export (rest of Phase 5).

## 2026-10-11 — Review round: first-principles fixes (Ricardo approved all)

- **Numbers reconcile:** Sales card adds "€X after VAT (€Y VAT)". Before, Sales €833 − Costs €596 ≠ Profit €174 because VAT was invisible.
- **Scenario in the link** (part of Phase 5, pulled forward): `#s=` + base64url JSON of only what differs from the template defaults, plus the seed, with a version field; decoding ignores bad data. The URL updates with `history.replaceState` (no history spam). "Copy link" button in the header. Old links keep working when defaults change (only diffs are stored), though their results then follow the new defaults for untouched fields.
- **Less repetition:** Break-even card merges cushion label, orders of room and customer tolerance into one sentence; the "How your scenarios spread" card is folded into the Profit card (closed by default); the goal card's "probability of a loss" line is removed (the Profit card already shows the chance of profit).
- **Screenshot context:** every result card ends with a caption (scenario · dish price · people · hours open · month/year), per SPEC §9. PNG export still to come (Phase 5).
- **Credibility:** "How this works" paragraph under the results.
- **Mobile:** sticky bar with most-likely profit and chance of profit until the results scroll into view.

## 2026-10-11 — Drinks per 10 orders; dishes per order moved (Ricardo)

- "Orders that include a drink" (%) renamed **"Drinks per 10 orders"** (unit pill "drinks", no % sign; Ricardo: per 10 is easier to imagine than per 100): defaults 2.5 / 4 / 6, maximum 50. Stored unchanged as drinks per order (0.40), so the model and results are unaffected. New unit `per10` (shown ×10); suggestions round to 0.1 drinks per 10 orders.
- **"Main dishes per order"** moved from Advanced to _Your customers_ — it is the third-biggest driver and describes what customers order, next to drinks. Advanced now holds only rent share, card fees, VAT, linked estimates, limits and seed.

## 2026-10-11 — Defaults adjusted (Ricardo)

- Ingredients + packaging per main dish: 3.25 / **3.00** / 2.75, upper limit €3.50 (was 3.50 / 2.70 / 2.00, limit €30). Suggested euro values now round to €0.05 so these reproduce exactly.
- People on shift **1**, most orders per hour **20**, setup + cleanup **2 h**.
- Capacity suggestion recalibrated so 1 person → 20 while keeping 2 people → 30 (Ricardo's earlier figure for two people with pre-cooked arepas): round(min(20 × people^0.585, 45)) → 1: 20, 2: 30, 3: 38, 4+: 45.
- Limits: "Orders that include a drink" up to **500%** (the model treats it as drinks per order, so >100% = several drinks per order; help text now says "drinks per 100 orders"); main dishes per order up to **7**.
- New sanity check: €199.14 profit, break-even 44.1 orders. Simulated: most likely ≈ €174, ~80% chance of a profitable day, ~38% customer tolerance.
- Note: with 20 orders/h capacity, busy-hour demand is often capped, so quiet-hour orders now drive high-profit scenarios about as much as busy-hour orders (the goal test was relaxed to accept either).

## 2026-10-11 — Defaults recalibrated: Kulturbrauerei Sunday market (Ricardo)

- All template defaults replaced with Ricardo's calibration (SPEC §4): dish €9 (cost 3.50 / 2.70 / 2.00), drink €3.50 (cost €0.90, homemade), busy hours 2/3/4, orders per busy hour 8/18/30, per quiet hour 2/6/12, drink in 25/40/60% of orders, 1.0/1.2/1.5 dishes per order, 2 people, capacity 30, open 6 h, setup 3 h, €18/h, rent €120, other €50, fees 1.5%, VAT 7/19%. Scenario name: "Arepa stand · Kulturbrauerei Sunday market, Berlin".
- Suggested spreads were set so each default equals the suggestion for its own "most likely" (so all worst/best start as "suggested").
- The per-field reasoning went into the ⓘ help texts (e.g. "Set cost per person to 0 if everyone works unpaid", Kleinunternehmer VAT = 0, rent quotes €60/€120/€250).
- "Busy hours upper limit = opening hours" needed no change: that limit already follows opening hours (now 6).
- New sanity check: €45.06 profit, break-even 66.0 orders (matches Ricardo's hand calculation of ~€40). Simulated most-likely ≈ €36, ~55% chance of a profitable day.
- Mechanics tests now set up their own cases where possible, so future default changes only touch the sanity-check tests.

## 2026-10-11 — Stress tests (request US-06, reviewed and scoped down with Ricardo)

- **Built:** (1) a customer-tolerance line on the Break-even card; (2) an expandable "What if things go worse than expected?" table (closed by default) in the same card. Neutral title chosen by Ricardo.
- **Not built, and why:** "downside profitability" as a headline (duplicates the Worst case figure and would show a second, conflicting "bad case"); a separate card; detailed stress controls under Advanced (configuration with no user benefit — parameters live in the template); the +10% ingredient/fixed rows (table trimmed to 7 rows). "Food waste" in the request does not exist in the model.
- **Method:** shocks are applied to the _same_ 10,000 draws (no new randomness), and each row reports the median profit, so "As expected" equals the Profit card exactly. Customer shocks scale both demand inputs before the capacity cap; ingredients = dish cost and drink cost; fixed = rent, wage rate and other costs. Tolerance = demand multiplier where median profit = €0, Illinois root search (~30–40 ms for everything); special cases for the serving limit and for every order losing money.
- Shareable-link compatibility: no URL state exists yet (Phase 5), so nothing to preserve.

## 2026-10-11 — Capacity suggested from people on shift (Ricardo)

- "Most orders you can serve per hour" stays a normal choice, but its value is now **suggested** from "People on shift" and follows it until the user types their own number (same pattern as suggested worst/best; "Use suggestion" restores it). No new inputs; the engine is unchanged.
- Suggestion = round(min(17 × people^0.8, 45)): one person alone handles ~17 orders/h; extra people share one grill and counter, so each adds a bit less (exponent 0.8); 45/h is the stand's ceiling. 2 people → 30 = previous default, so the sanity check is unchanged. Parameters live in the template (`capacitySuggestion`), not in the UI.
- Owner time is not modelled separately: "People on shift" includes the owner. No capacity alert or staffing advice.
- "People on shift" now sits next to the capacity field in _Your stand_.

## 2026-10-11 — Product mix replaces average spend (Ricardo)

- **Prices are choices.** "Average spend per order" (an estimate) is replaced by: price of a main dish and price of a drink (choices), share of orders that include a drink (estimate, _Your customers_), main dishes per order (estimate, Advanced). Spend per order = dishes × dish price + drink rate × drink price.
- **Costs split**: ingredients + packaging per main dish (estimate) and cost of a drink (choice), both in _Your product_. Cost per order = dishes × dish cost + drink rate × drink cost. Kept in € (not % of price), so raising a price doesn't raise ingredient costs.
- **VAT split is exact** from the order mix; the "drinks share of sales" setting is removed.
- **Correlations**: spend ↔ demand (−0.2) and spend ↔ cost (+0.3) removed — the first no longer applies because price is a choice, the second is now structural (a drink adds both price and cost). Only busy ↔ quiet demand (+0.6) remains.
- **Price changes don't move demand** (Ricardo chose option a): a hint under the prices says "If you raise prices, lower your order estimates too". A price-elasticity setting is under "Later".
- **Page structure**: inputs grouped by topic — _Your product_ (main dish: price + cost range; drink: price + cost; live "≈ €X per order" line), _Your customers_ (busy hours, orders per busy/quiet hour, orders with a drink), _Your stand_ (choices) + Advanced (main dishes per order range, VAT, card fees, rent share, linked estimates, limits, seed).
- **Defaults** (Ricardo): dish €7, drink €4, dish cost €3 (range €3.50 / €3.00 / €2.70), drink in every 2nd order (30% / 50% / 70%). Drink cost **€0.80** from research: German soft drinks by the crate cost roughly €0.55–0.75 per bottle (e.g. Club-Mate 20 × 0.5 l at €10.99 wholesale promo, fritz-kola 24 × 0.33 l at €17–18 retail, excl. deposit); €0.80 allows for cups/ice and pricier imported Latin drinks, and matches a typical 20–25% drinks cost on a €4 (€3.36 net) price. Sources: handelshof via prospektangebote.de, mydealz/famila, whk-controlling.de (Faktor 3–5 Getränkekalkulation).
- **Consequence**: the base case is now loss-making (−€111 a day; break-even ≈ 108 orders vs 84 expected; ~25% chance of a profitable day). The SPEC §4 sanity check and tests were updated to these numbers.
- Suggestion rounding: percentages to whole %, dishes to 0.05, otherwise as before; suggestions are clamped to the default limits.

## 2026-10-10 — Cushion label follows the chance of profit (Ricardo: yes)

- The break-even card's label is now based on the chance a typical day makes a profit, not on the margin of safety: ≥ 90% "Healthy cushion", 50–90% "Thin cushion", < 50% "Below break-even". At defaults (68%) it reads "Thin cushion" instead of "Healthy cushion". The "N orders of room" detail still uses median orders − median break-even.

## 2026-10-10 — Costs card (Ricardo)

- New "Costs per weekend day" card between Sales and Break-even (SPEC §6 card 2b). Sales and Costs sit side by side; Break-even now spans the full width below them.
- "Costs for the median day" = the simulated scenario whose total daily costs are closest to the median, not per-item medians, because medians of the line items don't add up to the median total. Fixed = wages, fixed rent, other costs; variable = ingredients + packaging, card fees, rent share of sales.
- Colours: fixed = violet `#4a3aa7`, variable = blue `#2a78d6` (validated pair: CVD ΔE 13, normal-vision ΔE 16.3, both ≥ 3:1 on white), always with text labels.
- Sales card gets a line "From about N orders a day" (median orders). An "average spend" figure was left out because median sales ÷ median orders (€11.77) differs from the €12 the user entered and would confuse.

## 2026-10-10 — Owner pay removed; "Check a goal" added (Ricardo)

- **Owner pay removed** from model, template and UI. Labour = people on shift × (opening + setup hours) × cost per person per hour. "People on shift" defaults to **2** (you + one helper) so the default numbers and the SPEC §4 sanity check are unchanged (€134.14 profit at base values); the help text says to include yourself if you want to pay yourself a wage. Profit card now reads "after all costs, including wages".
- **Check a goal** (SPEC §6 card 6). Engine: `analyzeGoal` in `src/engine/goal.ts`, reusing the existing 10,000 draws (no re-simulation). "What it would take" compares, per estimate, its typical (median) value in the scenarios that meet the goal with the user's most-likely value; ranked by percentile shift (mean rank percentile among those scenarios − 50%), shown if ≥ 5 points, top 3. Needs ≥ 50 scenarios on each side; otherwise a plain sentence. This is descriptive ("in the scenarios that reach this…"), not a recommendation, and linked estimates move together, so e.g. price rarely shows up because higher prices come with slightly fewer customers.
- Follow-up (Ricardo): goal card moved to the end of the results; wording is now "What’s the probability that my profit will be [above | below] €X?". Profit only — the sales option was dropped for simplicity (the engine still supports it). "Above" includes exactly €X.
- Follow-up 2 (Ricardo): goal amount accepts negative values (typed "-50", "−50" or via a ± button, since iOS/Android decimal keypads lack a minus key; the field is a text input with a strict number parser). A small, muted "Probability of a loss on a typical weekend day" line sits under the goal answer.
- The goal question is part of the scenario state (will go into the URL in Phase 5); template default: profit at least €200.

## 2026-10-08 — Phase 3 started: weekend-day page redesign (Ricardo's UI feedback)

- **Single-number mode removed** (SPEC §2). Replaced by auto-suggested worst/best from "most likely" using the template spread, rounded to friendly numbers; values follow "most likely" until typed; "Use suggestion" restores them. Template defaults equal their own suggestions.
- Suggested values that fall outside a limit (e.g. busy hours above opening hours) are clamped; typed values are not, so validation can flag them.
- **"What matters most" = option A**: Spearman as specified, bar length only (Big ≥ 0.5, Some ≥ 0.25, otherwise Small impact). Direction text comes from the template (costs lower profit), not from the sign of ρ, which can flip for linked inputs. Each input has a research tip.
- **Positive framing**: "N% chance a typical weekend day makes a profit"; cushion words "Healthy / Thin cushion / Below break-even"; capacity alert reads "Room to grow". The "every order loses money" message stays explicit but suggests a fix.
- Temporary preview page removed; the page lives in `src/ui/WeekendPage.tsx`, all text in `src/ui/copy.ts`.
- Visual system: system sans, navy ink, one blue accent for "most likely" and range bars, green/red only for profit/loss. Light mode only for now.
- Advanced settings and limits: same content and behaviour, restyled.

## 2026-10-07 — Phase 1 engine

**Implementation choices**

- RNG: sfc32, 128-bit state expanded from a 32-bit seed with splitmix32; first 15 outputs discarded. Normals via Box–Muller.
- Φ: Hart (1968) / West (2005) double-precision algorithm. Φ⁻¹: Acklam + one Halley step (accuracy ~1e-15, tested against Python's `statistics.NormalDist`).
- Metalog feasibility threshold 1.66711 (Keelin 2016) confirmed numerically by a test.
- **Fallback** (CLAUDE.md asked to log it): two-piece normal _in the same bound-transformed space_ — median p50, separate spreads below and above, scaled so p10/p90 are hit exactly. It stays inside the limits. It is also used for ties (worst = base or base = best). All three equal → a fixed value.
- Values exactly on a limit (e.g. worst = 0 orders) are moved 0.1% of the limit range inside it (never more than half-way to the next value), because the log transforms are infinite on the limit.
- Copula links samples by Gaussian Z directly (`fromNormal(z)`), so the fallback needs no Φ/Φ⁻¹ round trip.
- "Spend ↔ demand −0.2" is applied to both busy-hour and quiet-hour demand.
- Most-likely values are medians of the 10,000 scenarios. Margin of safety uses the median orders and median break-even (the two numbers shown on the card). "Every order loses money" fires when the median contribution per order ≤ 0. The capacity alert fires when the median share of demand turned away is > 5%.
- Phase 2 pulled forward: the arepa template is data in `src/templates/`, and `src/state/scenario.ts` turns it plus user changes into a simulation spec (single-number spreads, limits, overrides).
- Temporary **engine preview page** (`src/ui/preview/`) replaces the placeholder so Ricardo can test numbers before Phase 3. It uses a fixed default seed (12345) until URL state exists (Phase 5). It will be deleted in Phase 3.

**Open questions for Ricardo**

- _Sensitivity with linked inputs._ Spearman measures each input's total association with profit, including what moves with it. Ingredient cost is linked +0.3 to spend, and spend raises profit, so cost shows ≈ 0.00 (Default) or even +0.09 (Strong), versus −0.15 if inputs are independent. Options: (A) keep Spearman as specified and show bar length only, no sign; (B) partial rank correlation, which brings back the 2020 flaw (price looks too important); (C) rank on an independent run, which has the same problem. Recommendation: A.
- _Margin wording vs loss chance._ At defaults the margin of safety is 20% ("comfortable") while the chance of a losing typical day is 32%. Both are correct (medians vs whole distribution) but may read as contradictory.

## 2026-10-07 — Phase 0 plan (approved by Ricardo in chat; folded into SPEC v0.3 and CLAUDE.md)

**Stack & hosting**

- UI: React 19 + TypeScript + Vite. Charts are hand-built SVG components (no chart library), for full control over visual polish and PNG export. A static mockup of the result cards will be reviewed before Phase 3.
- Lint: **oxlint** (Vite's current default) instead of ESLint — faster, zero-config; Prettier for formatting.
- Tests: Vitest + fast-check (property tests).
- Hosting: GitHub Pages via GitHub Actions (repo is public, so free). CI runs lint, format check, typecheck, tests and build on every push/PR; `main` deploys.
- Repo: new repo `rrosasl/marketsizer_app`; the older Python `restaurant-market-sizer` app is a separate product and stays where it is.

**Structure** (deviation from CLAUDE.md §3 suggestion)

- Added `src/state/` for the scenario schema and URL codec, so it is pure and testable outside the UI.
- `src/ui/copy.ts` will hold all user-facing text in one place for review.

**Product principle (Ricardo)**

- Simplicity first, everywhere. Anything not needed by most users goes under "Advanced settings".

**Model / SPEC clarifications**

- _Owner hours_ = the same hours as staff (opening hours + setup/cleanup), so they follow opening hours automatically. With the defaults this is 10 h, not the 11 h in SPEC §4. The SPEC §4 sanity check (84 orders, €1,008 gross, €923.06 net, €134.14 profit, break-even ≈ 66.4, margin of safety ≈ 21%) is consistent with 10 h and stays as the acceptance test.
- _Busy hours_ are capped at opening hours in the model: `peak_orders` uses `min(peak_hours, open_hours)`.
- _"Most likely"_ = median of the simulated results (not the result at all-base inputs). The same applies to break-even and payback.
- _Profit-chance wording_: "Chance your typical weekend day loses money" — each simulated scenario is a possible _average_ day (SPEC §8), not a single day.
- _Capacity alert_: states facts only ("You may turn away ~N customers (~€X sales) at busy times"). No staffing recommendation.
- _Break-even check_: if break-even orders exceed the most the stand can serve (capacity × opening hours), show a warning.
- _Input limits_ (hidden by default; editable under Advanced settings): busy hours 0 to opening hours; orders per busy hour 0–150; orders per quiet hour 0–100; average spend €1–€60; ingredients per order €0–€30.
- _Correlation toggle_: Independent = all ρ = 0; Default = SPEC §5; Strong = each ρ × 1.5, capped at ±0.9 (matrix checked to be positive definite).
- _Margin of safety words_: below 0% = negative; 0–15% = thin; above 15% = comfortable.
- _Ramp-up_ scales both demand inputs before the capacity cap.
- _Refundable deposits_ (SPEC §7): dropped.

## Later

- Payback in market days (still per-day framing): one optional input "One-off setup costs" and a line on the Profit card, "You'd earn back €X after about N market days" (most likely, from the median daily profit).

- Price elasticity (Advanced): demand falls by X% per 10% price rise above a reference price.

- (none yet)
