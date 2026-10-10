# DECISIONS

Log of deviations from SPEC.md / CLAUDE.md and of choices SPEC leaves open. Newest first.

## 2026-10-10 — Owner pay removed; "Check a goal" added (Ricardo)

- **Owner pay removed** from model, template and UI. Labour = people on shift × (opening + setup hours) × cost per person per hour. "People on shift" defaults to **2** (you + one helper) so the default numbers and the SPEC §4 sanity check are unchanged (€134.14 profit at base values); the help text says to include yourself if you want to pay yourself a wage. Profit card now reads "after all costs, including wages".
- **Check a goal** (SPEC §6 card 6). Engine: `analyzeGoal` in `src/engine/goal.ts`, reusing the existing 10,000 draws (no re-simulation). "What it would take" compares, per estimate, its typical (median) value in the scenarios that meet the goal with the user's most-likely value; ranked by percentile shift (mean rank percentile among those scenarios − 50%), shown if ≥ 5 points, top 3. Needs ≥ 50 scenarios on each side; otherwise a plain sentence. This is descriptive ("in the scenarios that reach this…"), not a recommendation, and linked estimates move together, so e.g. price rarely shows up because higher prices come with slightly fewer customers.
- Follow-up (Ricardo): goal card moved to the end of the results; wording is now "What’s the probability that my profit will be [above | below] €X?". Profit only — the sales option was dropped for simplicity (the engine still supports it). "Above" includes exactly €X.
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

- (none yet)
