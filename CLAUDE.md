# CLAUDE.md: Project briefing

Read this file and `SPEC.md` before doing anything. `SPEC.md` is the source of truth for the model, inputs and outputs. This file covers context, decisions, working rules and the build plan.

---

## 1. What we're building

A free, browser-based **simulator for people planning a pop-up food stand**. The first template is an arepa stand in a Berlin market hall (Markthalle). The user enters their estimates as *worst / base / best* values. The app simulates 10,000 scenarios and shows:

- sales and profit for a typical weekend day, with a realistic range
- how many orders per day are needed to break even
- what drives the result most, i.e. what to research next
- optionally, month and year figures and how long until the setup costs are earned back

**Who it's for:** first-time food entrepreneurs, not analysts. They will **screenshot the result cards into pitch decks**, so every card must be understandable on its own.

**Owner:** Ricardo, who designed the methodology and will review all modelling decisions.

---

## 2. Background (why the design is what it is)

The project evolves a 2020 notebook (Monte Carlo market sizing for an arepa restaurant). That notebook had flaws that **must not be repeated**:

| 2020 flaw | What we do instead |
|---|---|
| Ad-hoc skew-normal fit: entered p10/p50/p90 were not reproduced (e.g. 3/4/6 came out as 2.99/4.20/5.62) | 3-term **metalog** fitted exactly to (worst, base, best) as (p10, p50, p90) |
| Truncation by rejection distorted the percentiles | Bounds built into the metalog (bounded / semi-bounded variants) |
| All inputs independent, so price looked like the biggest driver because a higher price never cost any customers | **Gaussian copula** with a template-fixed correlation matrix |
| One-at-a-time sensitivity, mixing mean and median | **Spearman rank correlation** of each input with daily profit |
| No capacity limit, no seasonality, no ramp-up | Capacity cap per hour, separate weekday/weekend day types, ramp-up months |

### Key decisions already made (don't reopen without asking)

1. **Inputs describe the average level, not day-to-day swings.** Each simulation draw is one possible "true typical day", and months are built from that same draw. Rationale: for a new stand the main uncertainty is whether it's a hit at all. Treating inputs as daily noise would average out over a month and make the ranges falsely narrow. See SPEC §8.
2. **Decisions vs. uncertainties.** Only things the user *estimates* get worst/base/best (5 inputs). Things the user *chooses* (opening hours, staff, wages, rent terms) take a single value.
3. **Correlations are fixed per template** and hidden from the user, with only an advanced toggle (Independent / Default / Strong).
4. **Two break-evens:** daily operating break-even (orders per day) and payback (months to recover setup costs).
5. **The owner's own labour is costed explicitly** (owner works the same hours as staff; the rate can be set to 0, but it's always visible).
6. **The weekend day is the default page.** Month/year is optional and opened by the user.
7. **No jargon in the UI:** no "P10", "Monte Carlo" or "distribution". Use *Worst case / Most likely / Best case*.
8. **UI language: English.** Number format `€1,234.50`.
9. **Simplicity first.** Anything most users don't need goes under "Advanced settings".

---

## 3. Tech stack & architecture

- **Static, client-side web app.** No backend, no accounts, no data leaves the browser.
- TypeScript (strict) + Vite + React 19. Charts are hand-built SVG components (no chart library) and must look polished.
- Lint: oxlint. Format: Prettier. Testing: Vitest + fast-check. `npm run check` runs all of them.
- The engine must be pure, framework-free TypeScript with no DOM dependencies.
- Scenario state, **including the random seed**, is serialised into the URL, so a shared link reproduces the exact result.
- Deployment: GitHub Pages via GitHub Actions (`.github/workflows/ci.yml`); every push to `main` that passes checks deploys.

Structure:
```
/src/engine/      # pure TS: rng, metalog, copula, model, sensitivity, extrapolation
/src/templates/   # template definitions (inputs, defaults, bounds, correlations)
/src/state/       # scenario schema + URL codec (pure, tested)
/src/ui/          # components, cards, charts; copy.ts holds all UI text
/tests/           # engine unit + property tests
SPEC.md  CLAUDE.md  DECISIONS.md
```

---

## 4. Engine notes (to get the maths right)

**Seeded RNG:** use a small, well-known PRNG (e.g. sfc32 or mulberry32). Never use `Math.random()` in the engine.

**3-term metalog from p10/p50/p90** (α = 0.1, L = ln 9):
```
Quantile:  M(y) = a1 + a2·ln(y/(1−y)) + a3·(y − 0.5)·ln(y/(1−y))
a1 = x50
a2 = (x90 − x10) / (2L)
a3 = (x90 + x10 − 2·x50) / ((1 − 2α)·L)
```
- **Bounds:** fit in transformed space, then back-transform.
  - Lower bound lb: z = ln(x − lb); x = lb + e^M.
  - Both bounds: z = ln((x − lb)/(ub − x)); x = (lb + ub·e^M)/(1 + e^M).
- **Feasibility:** require a2 > 0 and |a3|/a2 < ~1.667 (verify the threshold against Keelin 2016). If the fit is infeasible, fall back to a two-piece normal and surface a gentle UI note. Log the fallback choice in DECISIONS.md.
- Clamp uniforms to [1e-6, 1 − 1e-6] to avoid infinities.
- **For cost inputs, worst = highest value.** The template marks the direction, and the engine maps worst/best to p90/p10 accordingly.

**Copula:** Z ~ N(0, Σ) via Cholesky → U = Φ(Z) → X = metalog quantile(U). Check that Σ is positive definite (fail loudly in tests). The SPEC's ρ values are intended as rank correlations, so convert with r = 2·sin(π·ρ/6) for the Gaussian parameter.

**Sensitivity:** Spearman ρ between each uncertain input and daily profit. Show the top 5 plus a plain-language sentence about the biggest one.

**Required tests (acceptance criteria):**
- The metalog reproduces the input p10/p50/p90 within 1% (bounded and unbounded cases).
- Sampled rank correlations are within ±0.03 of their targets at n = 10,000.
- The same seed gives identical results; a different seed changes the results.
- At base values with zero uncertainty, the model reproduces the SPEC §4 sanity check (84 orders, €1,008 gross, €923.1 net, €134.1 profit, break-even ≈ 66.4 orders).
- Capacity cap: demand above capacity produces lost orders, not extra sales.
- Contribution per order ≤ 0 triggers the "every order loses money" warning state.
- Payback is reported as "not within 3 years" when cumulative cash never turns positive.
- Performance: 10,000 draws plus sensitivity in < 200 ms on a mid-range laptop.

---

## 5. Build plan (phases)

Work phase by phase. At the end of each phase: run the tests, summarise what was done, and **wait for Ricardo's go-ahead** before starting the next one.

| Phase | Scope | Done when |
|---|---|---|
| 0. Plan & scaffold | Propose framework, structure and host; set up repo, lint, test runner, CI | Ricardo approves the plan; empty app builds and deploys |
| 1. Engine | RNG, metalog (+bounds, fallback), copula, day model, break-even, sensitivity | All §4 tests pass |
| 2. Template | Arepa-stand template from SPEC §4 as data (not hard-coded in the UI) | Engine runs end to end from the template |
| 3. Weekend-day page | Input form (worst/base/best + ⓘ texts, single-number mode, validation) and output cards 1–5 (SPEC §6) | A non-expert can go from defaults to results without help |
| 4. Month & year | SPEC §7 inputs, extrapolation, payback, cards 6–8 | Tests for ramp-up and payback pass |
| 5. Share & export | URL state + seed, PNG card export (16:9 and 1:1), deploy | A shared link reproduces the results; exported cards are readable when projected |

---

## 6. Working rules

- **Follow SPEC.md.** If something in it is ambiguous, wrong or impossible, **stop and ask** rather than guess.
- **Log every deviation** from SPEC or from this file in `DECISIONS.md` (date, what changed, why). Never absorb a change silently.
- **Respect the non-goals** (SPEC §10): no extra templates, no formula builder, no login, no backend. Suggest ideas in DECISIONS.md under "Later"; don't build them.
- Keep the engine pure and fully tested before building UI on top of it.
- UI copy must be plain English for non-experts. If you're unsure about wording, propose 2 options.
- Small, reviewable commits with clear messages.
- Ricardo prefers **concise, direct communication**: short summaries, decisions flagged, no padding.
