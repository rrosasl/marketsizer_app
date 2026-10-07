# DECISIONS

Log of deviations from SPEC.md / CLAUDE.md and of choices SPEC leaves open. Newest first.

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
