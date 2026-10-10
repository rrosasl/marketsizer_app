/** All user-facing text for the weekend-day page, in one place for review. Plain English only. */
export const copy = {
  brand: 'MarketSizer',
  pageTitle: 'Your weekend day',
  pageIntro:
    'See what a typical weekend day could look like for your stand: sales, profit and how many orders you need.',

  estimatesTitle: 'Your estimates',
  estimatesIntro:
    'Start with what you think is most likely. We suggest a worst and best case for you — change them if you know better.',
  estimatesInfo:
    'Most likely: what you realistically expect on a typical day. Worst case: a realistic bad scenario, not a disaster — roughly a 1-in-10 chance reality turns out worse. Best case: a realistic good scenario — roughly a 1-in-10 chance reality turns out better.',
  worst: 'Worst',
  likely: 'Most likely',
  best: 'Best',
  suggested: 'suggested',
  useSuggestion: 'Use suggestion',
  costHint: 'For costs, worst = most expensive.',

  choicesTitle: 'Your choices',
  choicesIntro: 'Things you decide yourself. One number each.',

  advancedTitle: 'Advanced settings',
  linkedLabel: 'Linked estimates',
  linkedHelp: 'How strongly estimates move together (e.g. busy and quiet hours).',
  linkedOptions: { independent: 'Independent', default: 'Default', strong: 'Strong' },
  limitsTitle: 'Limits',
  limitsIntro: 'The lowest and highest values an estimate can ever take.',
  limitTo: 'to',
  seedLabel: 'Random seed',
  seedHelp: 'Same seed + same inputs = exactly the same results.',
  seedNew: 'New',
  reset: 'Reset to defaults',

  errors: {
    notANumber: 'Please enter a number in every box.',
    orderNormal: 'Worst should be the lowest number and best the highest.',
    orderCost: 'Worst should be the most expensive and best the cheapest.',
    belowMin: (min: string) => `Can't be below ${min}.`,
    aboveMax: (max: string) => `Can't be above ${max}.`,
    aboveOpenHours: (max: string) => `Can't be more than your opening hours (${max}).`,
  },

  resultsTitle: 'Results for one weekend day',
  resultsInvalid: 'Fix the highlighted estimates to see your results.',
  resultsError: 'Something went wrong while calculating:',

  mostLikely: 'Most likely',
  worstCase: 'Worst case',
  bestCase: 'Best case',

  profitTitle: 'Profit per weekend day',
  profitSub: 'after all costs, including wages',
  profitChance: 'chance a typical weekend day makes a profit',

  salesTitle: 'Sales per weekend day',
  salesSub: 'what customers pay, incl. VAT',
  salesOrders: (orders: string) => `From about ${orders} orders a day.`,

  costsTitle: 'Costs per weekend day',
  costsSub: 'what a most likely day costs you',
  costsFixed: 'Fixed',
  costsFixedHelp: 'The same however busy the day is.',
  costsVariable: 'Variable',
  costsVariableHelp: 'Grows with every order.',
  costsInfo:
    'This is one of the 10,000 simulated days: the one whose total costs are right in the middle. Fixed costs stay the same however many orders you sell; variable costs grow with every order.',
  costItems: {
    wages: 'Wages',
    rentFixed: 'Rent',
    other: 'Other costs',
    ingredients: 'Ingredients + packaging',
    cardFees: 'Card fees',
    rentShare: 'Rent (share of sales)',
  },
  costsRange: (lo: string, hi: string) => `Most days cost between ${lo} and ${hi}.`,

  breakevenTitle: 'Break-even',
  breakevenLine: (need: string, expect: string) =>
    `You need about ${need} orders a day to cover your costs. You expect about ${expect}.`,
  breakevenMarker: 'Break-even',
  breakevenExpected: 'You expect',
  cushion: {
    comfortable: 'Healthy cushion',
    thin: 'Thin cushion',
    negative: 'Below break-even',
  },
  cushionDetail: (orders: string) => `${orders} orders of room above break-even`,
  cushionShort: (orders: string) => `${orders} orders short of break-even`,
  breakevenAboveCapacity: (max: string) =>
    `Break-even is more than you can serve in a day (about ${max} orders at most).`,

  spreadTitle: 'How your scenarios spread',
  spreadSub: 'Each bar is a group of simulated days. Green made a profit; red did not.',
  spreadHint: 'Point at a bar to see its range.',
  spreadReadout: (from: string, to: string, share: string) =>
    `${from} to ${to} · ${share} of scenarios`,

  goalTitle: 'Check a goal',
  goalInfo:
    'We count how many of the 10,000 simulated weekend days reach your goal. Each simulated day is one possible “typical day” for your stand.',
  goalAsk: 'What’s the probability that my profit will be',
  goalDirection: { 'at-least': 'above', below: 'below' },
  goalResult: (dir: string, amount: string) =>
    `probability that your profit on a typical weekend day will be ${dir} ${amount}`,
  goalLikely: (value: string) => `Your most likely profit is ${value}.`,
  goalLossChance: (pct: string) => `Probability of a loss on a typical weekend day: ${pct}`,
  goalTakesTitle: { 'at-least': 'What it would take', below: 'What that would look like' },
  goalTakesIntro: {
    'at-least':
      'In the scenarios that reach this goal, these estimates are typically different from your most likely values:',
    below:
      'In the scenarios where this happens, these estimates are typically different from your most likely values:',
  },
  goalTakesWhen: 'In those scenarios',
  goalTakesYou: 'You expect',
  goalTooRare:
    'Almost none of your scenarios reach this, so there is too little to say what it would take.',
  goalTooCommon: 'Almost every scenario reaches this — no change needed.',
  goalNothingStandsOut: 'No single estimate stands out — it takes a bit of everything.',

  driversTitle: 'What matters most',
  driversIntro:
    'Which of your estimates moves your profit the most. A longer bar means your result depends more on getting that estimate right.',
  driversInfo:
    'We ran 10,000 scenarios with different combinations of your estimates and checked how closely profit followed each one. Narrowing down the top estimates makes your whole forecast more reliable.',
  strength: { strong: 'Big impact', medium: 'Some impact', small: 'Small impact' },
  higherMore: 'Higher → more profit',
  higherLess: 'Higher → less profit',
  startHere: 'Start here',
  biggest: (label: string) =>
    `Your result depends most on ${label}. Pinning this down will make your forecast much more reliable.`,

  everyOrderLoses:
    'Each order currently costs more than it brings in. Try a higher price or lower ingredient costs.',
  capacityTitle: 'Room to grow',
  capacityText: (customers: string, sales: string) =>
    `At busy times, about ${customers} more customers may want to order than you can serve — around ${sales} in extra sales.`,

  footnote: (draws: string) =>
    `Worst/best = 1-in-10 scenarios. Based on ${draws} simulated scenarios of your inputs.`,
  fallbackNote: (labels: string) =>
    `Some estimates are very lopsided, so we used a simpler shape for: ${labels}.`,

  mathTitle: 'See the math for a day with every estimate at “most likely”',
  mathNote:
    'This is not the same as “most likely” above: that is the middle of 10,000 scenarios, where bad combinations pull harder than good ones.',
  math: {
    orders: 'Orders',
    gross: 'Sales incl. VAT',
    net: 'Sales excl. VAT',
    ingredients: 'Ingredients + packaging',
    fees: 'Card fees',
    rent: 'Rent',
    staff: 'Wages',
    other: 'Other costs',
    profit: 'Profit',
    breakeven: 'Break-even orders',
  },
} as const
