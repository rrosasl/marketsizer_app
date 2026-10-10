# SPEC v0.5 — Pop-up Food Stand Simulator

**Changelog v0.5 (2026-10-10):** owner pay removed — the user adds themselves to "People on shift" if they want to pay themselves (default 2 people); new "Check a goal" card (probability that profit will be above / below €X, plus what it would take), placed last.

**Changelog v0.4 (UI feedback 2026-10-08):** "I only know one number" mode removed; worst/best are auto-suggested from "most likely" and can be overridden; "most likely" is the primary field; positive framing (chance of profit, "room to grow", cushion words); "What matters most" shows strength only, with plain-language help and a research tip.

**Changelog v0.3:** simplicity principle (complexity goes under Advanced settings); owner hours = staff hours; busy hours capped at opening hours; "most likely" = median; break-even capacity warning; input limits (editable under Advanced); correlation toggle defined; margin-of-safety words defined; capacity alert states facts only; refundable deposits dropped. Details in DECISIONS.md.

**Changelog v0.2:** UI language = English; decisions-vs-uncertainties confirmed; VAT split food 7% / drinks 19%; defaults calibrated (avg spend, opening hours, staff cost); trading-day defaults reflect Markthalle reality (Saturday-only weekend).

Status: draft for review in chat. Once frozen, this file is the single source of truth for Claude Code.
Test case: arepa stand in a Berlin Markthalle.

---

## 1. Product principles

1. **Audience: non-experts. UI language: English (v1).** No jargon in the UI: no "P10", "Monte Carlo", "distribution" or "correlation". Labels say *Worst case / Most likely / Best case*.
2. **Minimum friction.** The default page is one **weekend day**. Everything else (weekdays, month, year, payback) is optional.
3. **Decisions vs. uncertainties.** Things the user *chooses* (opening hours, staff count, wage) take a single value. Things the user *estimates* (orders, spend, costs) take worst / base / best.
4. **Screenshot-ready.** Every output is a self-contained card that reads correctly in a pitch deck with no surrounding context.
5. **Private and shareable.** All computation runs client-side. Scenario state, including the random seed, is stored in the URL.
6. **Simplicity first.** Show only what most users need. Everything else (input limits, correlation setting, single-number spreads, etc.) lives under **Advanced settings**.

---

## 2. Guided input: worst / base / best

Each uncertain input has three fields plus an ⓘ button.

**Info text (draft):**
> **Base case:** what you realistically expect on a typical day.
> **Worst case:** a realistic bad scenario, not a disaster. There's roughly a 1-in-10 chance reality turns out worse than this.
> **Best case:** a realistic good scenario. There's roughly a 1-in-10 chance reality turns out better than this.

Notes:
- The inputs describe the **average level** (e.g. "how busy a typical weekend day will be"), not swings from one day to the next. See §8 for why.
- For **cost inputs**, worst means the *highest* value. The UI shows the fields in the order worst → base → best and adds a hint ("worst = most expensive").
- **Auto-suggested range:** the user enters "most likely" first; worst and best are filled in automatically from the template's spread (§4), rounded to friendly numbers (whole numbers from 10 up, one decimal below). They follow "most likely" until the user types their own value; a "Use suggestion" link restores the suggestion. "Most likely" is visually primary; worst/best are secondary.
- Validation: the values must be ordered (worst ≤ base ≤ best, or reversed for costs). If they aren't, show an inline message in plain language.
- Limits (minimum/maximum) are set by the template, hidden by default and editable under Advanced settings (see §4).

---

## 3. Model: one day

Defined separately for each day type d ∈ {weekend, weekday}. The weekend is the default page.

### Revenue
```
peak_hours_eff  = min(peak_hours, open_hours)
offpeak_hours   = open_hours − peak_hours_eff
peak_orders     = min(peak_demand_per_h,    capacity_per_h) × peak_hours_eff
offpeak_orders  = min(offpeak_demand_per_h, capacity_per_h) × offpeak_hours
orders          = peak_orders + offpeak_orders
lost_orders     = (peak_demand_per_h − capacity_per_h)⁺ × peak_hours_eff + (same for off-peak)
gross_sales     = orders × avg_spend_gross          # what customers pay, incl. VAT
net_sales       = gross_sales × (1 − drinks_share)/(1 + vat_food)
                + gross_sales × drinks_share/(1 + vat_drinks)
```

### Costs
```
ingredients     = orders × cost_per_order            # food + packaging
payment_fees    = gross_sales × card_fee_rate
rent            = rent_fixed_per_day + net_sales × rent_revenue_share
staff           = staff_count × (open_hours + setup_hours) × staff_cost_per_h
other_daily     = other_costs_per_day                # energy, cleaning, waste, consumables
daily_costs     = ingredients + payment_fees + rent + staff + other_daily
profit          = net_sales − daily_costs
```

### Operating break-even (orders per day)
```
net_per_order          = net_sales / orders
contribution_per_order = net_per_order × (1 − rent_revenue_share)
                         − cost_per_order − avg_spend_gross × card_fee_rate
fixed_per_day          = rent_fixed_per_day + staff + other_daily
breakeven_orders       = fixed_per_day / contribution_per_order
margin_of_safety       = (orders − breakeven_orders) / orders
```
If contribution_per_order ≤ 0, show a hard warning: "Every order loses money. Check your price or costs."
If breakeven_orders > capacity_per_h × open_hours, warn: "Break-even is more than you can serve in a day."

---

## 4. Template defaults: arepa stand, Berlin Markthalle

⚠️ **Placeholders. Calibrate with research before freezing.**

### Uncertainties (worst / base / best)
| Input | Unit | Worst | Base | Best | Suggested spread | Limits (Advanced) |
|---|---|---|---|---|---|---|
| Busy hours per day | h | 2 | 3 | 4 | ±33% | 0 – opening hours |
| Orders per busy hour (demand) | orders/h | 10 | 18 | 28 | −45% / +55% | 0 – 150 |
| Orders per quiet hour (demand) | orders/h | 3 | 6 | 10 | −50% / +65% | 0 – 100 |
| Average spend per order (incl. VAT) | € | 10.00 | 12.00 | 14.00 | −17% / +17% | €1 – €60 |
| Ingredients + packaging per order | € | 3.80 | 3.20 | 2.80 | +20% / −12% | €0 – €30 |

### Decisions (single value)
| Input | Default | Note |
|---|---|---|
| Opening hours (weekend day) | 8 h | Markthalle Neun Saturday 10:00–18:00 |
| Max orders per hour you can serve | 30 | 2 people at the counter |
| People on shift | 2 | everyone paid for the shift; include yourself to pay yourself a wage |
| Setup + cleanup hours | 2 h | added to staff hours |
| Cost per person per hour (employer) | €18 | min. wage €13.90 (2026) + ~21% employer SV, or minijob flat ~30% |
| Rent: fixed per day | €120 | **placeholder: no public data, get a quote from the hall** |
| Rent: share of sales | 0% | many halls use fixed + % |
| Card / payment fees | 1.5% | |
| VAT food / drinks | 7% / 19% | Food 7% since 1 Jan 2026 for eat-in and takeaway alike |
| Drinks share of sales | 20% | needed to split VAT |
| Other costs per day | €25 | |

Sanity check at base values (2 people × 10 h): 84 orders → €1,008 gross / €923 net sales per day, €134 profit/day (after owner pay), break-even ≈ 66 orders, margin of safety ≈ 21%.

Calibration sources (Oct 2026): Berlin restaurant arepas €12–14, drinks €3.50–4.00; Markthalle Street Food Thursday dishes ~€6–15; Markthalle Neun hours Sat 10–18, Fri 12–18, Thu street food 17–22, closed Sun (except monthly breakfast market).

**Least-calibrated inputs: orders per busy/quiet hour.** No public data exists. Best calibration: count orders per hour at a comparable stall on a Saturday (one observation session).

---

## 5. Uncertainty engine

- **Distributions:** 3-term **metalog** fitted to (worst, base, best) as (p10, p50, p90), with template bounds (bounded or semi-bounded variant).
  - Acceptance test: the fitted p10/p50/p90 reproduce the inputs within 1%.
  - Check feasibility. If the metalog is infeasible (very lopsided inputs), fall back to a two-piece normal and show a gentle note to the user. Exact fallback to be decided in Code.
- **Linked uncertainties:** a Gaussian copula with a **template-fixed** correlation matrix. It is not shown to the user; an Advanced setting offers Independent (all ρ = 0) / Default (table below) / Strong (each ρ × 1.5, capped at ±0.9).

| Pair | Default ρ | Rationale |
|---|---|---|
| Busy-hour demand ↔ quiet-hour demand | +0.6 | A popular stand is popular all day |
| Avg spend ↔ demand (both) | −0.2 | Higher spend per order, fewer orders |
| Avg spend ↔ ingredient cost per order | +0.3 | Bigger orders cost more |
| Weekend demand ↔ weekday demand (full weekday mode) | +0.7 | Same stand, same reputation |

- **Draws:** 10,000, seeded. The seed is stored in the URL so results are reproducible.
- **Sensitivity:** Spearman rank correlation of each uncertain input with **daily profit**. Report the top 5.

---

## 6. Outputs: weekend day page (default)

All outputs are cards. Each card has a title, a headline number, a worst–best range, a one-line footnote, and a small brand mark.

"Most likely" = median of the simulated results (also for break-even and payback). Worst/best = 10th/90th percentile.

1. **Sales per weekend day:** "Most likely €X · Worst case €A · Best case €B", with a range bar.
2. **Profit per weekend day (after all costs, including wages):** same format, plus "N% chance a typical weekend day makes a profit" (each scenario is a possible *average* day, see §8).
3. **Break-even:** "You need about N orders a day to cover your costs. You expect about M." Shown as a bar with the break-even line. Margin of safety is phrased in words: "Below break-even" (< 0%), "Thin cushion" (0–15%), "Healthy cushion" (> 15%), plus the number of orders of room.
4. **What matters most:** a top-5 bar chart with plain labels. Bars show strength only (Big / Some / Small impact), no sign; the direction label ("Higher → more profit") comes from the model, not from the correlation sign. A short intro, an ⓘ explanation, and a "Start here" box with a template research tip for the top driver.
5. **Capacity alert** (shown only if lost orders exceed 5% of demand in the most-likely case): "Room to grow. At busy times, about N more customers may want to order than you can serve — around €X in extra sales." Facts only; no staffing advice.

6. **Check a goal** (last section of the page): "What’s the probability that my profit will be [above | below] €X?" (profit only) → share of the 10,000 scenarios that meet it (shown as <1% / >99% at the extremes), with the most-likely value for context. Below it, "What it would take" (or "What that would look like" for *below*): up to 3 estimates whose typical value in the scenarios that meet the goal differs most from the user's most-likely value. Ranked by the average percentile rank of the estimate among those scenarios minus 50%; shown only if that shift is ≥ 5 points, and only if at least 50 scenarios fall on each side. Default question: profit at least €200.

Footnote convention: "Worst/best = 1-in-10 scenarios. Based on 10,000 simulated scenarios of your inputs."

---

## 7. Optional: extend to month & year

Opened via a "See your month and year →" button.

### Inputs
- **Trading days per week:** weekend days (default 1, since many market halls are closed Sundays), weekdays (default 0).
- **Weekday opening hours:** separate decision input (e.g. Fri 12–18 = 6 h, Street Food Thursday 17–22 = 5 h).
- **Weekday scenario:** *simple mode* (default) is a single slider "A weekday is __% as busy as a weekend day" (default 60%), which scales both demand inputs. *Full mode* gives a separate worst/base/best set.
- **Weeks open per year:** default 48.
- **Ramp-up:** "In your first __ months, expect __% of normal demand" (default 2 months at 60%). Scales both demand inputs before the capacity cap.
- **Monthly fixed costs** (insurance, permits, accounting, storage): default €250.
- **One-off setup costs:** equipment €6,000; initial stock €800; permits/hygiene €300.

### Logic (per simulation draw)
```
days_per_month_d  = days_per_week_d × weeks_open/12
month_profit_m    = Σ_d days_per_month_d × daily_profit_d(ramp_factor_m) − monthly_fixed
cumulative_m      = −setup_costs + Σ_{k≤m} month_profit_k
payback_month     = first m where cumulative_m ≥ 0   (horizon 36 months; otherwise "not within 3 years")
```

### Outputs (cards)
6. **Monthly sales & profit** (after ramp-up): most likely + range.
7. **Yearly sales & profit** (first full year, including ramp-up).
8. **Payback:** "Most likely you earn back your €X setup costs in N months." Plus "Chance of earning it back within 12 months: N%." Shown as a cumulative cash curve with a band and a zero line.

---

## 8. Methodological note (why inputs are averages, not daily swings)

If worst/base/best described day-to-day swings, adding up 20+ days would cancel out most of the uncertainty, and monthly ranges would look falsely narrow. For a new stand, the dominant uncertainty is the **level**: is it a hit or not? So each draw represents one possible "true average day", and months are built from that same day. This is conservative and honest. Day-to-day volatility is a possible later extension (v2).

---

## 9. Screenshot / pitch-deck requirements

- An "Export card" button on each card produces a PNG. Default 16:9, optional 1:1.
- Cards carry their own context: the scenario name (e.g. "Arepa stand · Markthalle Berlin · weekend day"), a key-assumptions footnote, and a date.
- High-contrast palette that stays readable when projected. No hover-only information.

---

## 10. Non-goals for v1

Multiple templates · user-defined formulas · accounts or login · backend · tax beyond VAT · financing/loans · day-to-day volatility.

---

## 11. Open questions

1. ~~UI language~~ → English. Number format `€1,234.50`.
2. ~~VAT~~ → resolved. Rent: needs a real quote (fixed/day vs. fixed + % share).
3. Demand per hour: calibrate via one observation session at a comparable stall.
4. Product name / brand mark on exported cards.
