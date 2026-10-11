# DECISIONS

Log of deviations from SPEC.md / CLAUDE.md and of choices SPEC leaves open. Newest first.

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

- Price elasticity (Advanced): demand falls by X% per 10% price rise above a reference price.

- (none yet)
