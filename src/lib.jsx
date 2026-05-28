// ─────────────────────────────────────────────────────────────────────────────
// Pupsic — shared lib: formatters, plan tiers, mock data, primitives
// ─────────────────────────────────────────────────────────────────────────────

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ── Formatters ──────────────────────────────────────────────────────────────
// Swiss thousands separator = apostrophe.
const fmtCHF = (n, { decimals = 0, sign = false } = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  const abs = Math.abs(v).toFixed(decimals);
  const [int, dec] = abs.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019'); // ’
  const prefix = v < 0 ? '−' : (sign && v > 0 ? '+' : '');
  return `${prefix}CHF ${grouped}${dec ? '.' + dec : ''}`;
};

// Multi-currency formatter — symbol/code driven by country
const CURRENCY_META = {
  CHF: { code: 'CHF', symbol: 'CHF', position: 'pre' },
  EUR: { code: 'EUR', symbol: '€',   position: 'pre' },
  GBP: { code: 'GBP', symbol: '£',   position: 'pre' },
  USD: { code: 'USD', symbol: '$',   position: 'pre' },
};
const fmtMoney = (n, currency = 'CHF', { decimals = 0, sign = false } = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const meta = CURRENCY_META[currency] || CURRENCY_META.CHF;
  const v = Number(n);
  const abs = Math.abs(v).toFixed(decimals);
  const [int, dec] = abs.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019');
  const prefix = v < 0 ? '−' : (sign && v > 0 ? '+' : '');
  return `${prefix}${meta.symbol} ${grouped}${dec ? '.' + dec : ''}`;
};
const fmtMoneyShort = (n, currency = 'CHF') => {
  if (!Number.isFinite(n)) return '—';
  const meta = CURRENCY_META[currency] || CURRENCY_META.CHF;
  if (Math.abs(n) >= 1e6) return `${meta.symbol} ${(n / 1e6).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(n) >= 1e3) return `${meta.symbol} ${(Math.round(n / 100) / 10).toFixed(1).replace('.', ',')}k`;
  return fmtMoney(n, currency);
};

const fmtCHFShort = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e6) return `CHF ${(n / 1e6).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(n) >= 1e3) return `CHF ${Math.round(n / 100) / 10}k`.replace('.', ',');
  return fmtCHF(n);
};

const fmtNum = (n, decimals = 0) => {
  if (!Number.isFinite(n)) return '—';
  return Number(n).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019');
};

const fmtPct = (n, decimals = 1) => {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals).replace(/\.0$/, '')}%`;
};

// ── Plan tiers ──────────────────────────────────────────────────────────────
const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceCHF: 30,
    pitch: 'Visualisez vos fuites',
    features: [
      'RevOps Calculator',
      '1 scénario sauvegardé',
      'Benchmarks Forrester',
    ],
    caps: { scenarios: 1, mmm: false, mediaPlan: false, seats: 1, api: false },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceCHF: 99,
    pitch: 'Pilotez votre mix',
    features: [
      'Tout Starter +',
      'Marketing Mix Model (8 canaux)',
      'Media Plan builder',
      '10 scénarios',
      'Export PDF',
    ],
    starred: true,
    caps: { scenarios: 10, mmm: true, mediaPlan: true, seats: 1, api: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCHF: 299,
    pitch: 'Optimisez en continu',
    features: [
      'Tout Growth +',
      'Multi-workspace, 5 sièges',
      'Suivi mensuel automatisé',
      '1 crédit audit Pupsic / trimestre',
      'API',
    ],
    caps: { scenarios: Infinity, mmm: true, mediaPlan: true, seats: 5, api: true },
  },
};
const PLAN_ORDER = ['starter', 'growth', 'pro'];
const planRank = (id) => PLAN_ORDER.indexOf(id);
const planAllows = (planId, need) => planRank(planId) >= planRank(need);

// ── MMM channel definitions ────────────────────────────────────────────────
// Each: baseROAS at low spend, saturation (CHF where curve hits ~63% of ceiling),
//       ceiling (max monthly revenue, asymptotic), carryover (% to next period).
// Response: revenue(spend) = ceiling * (1 - exp(-spend / saturation))
//   At spend << saturation:  revenue ≈ ceiling * spend / saturation
//   ⇒ baseROAS ≈ ceiling / saturation  (we keep these consistent in defaults)
// Distinct hues per channel — derived from the Pupsic palette.
// Calibrated so at a typical SME paid budget (CHF 80–150k/mo) the blended
// attribution ROAS lands at ~5×. Base ROAS values match 2024 benchmarks:
// WordStream Industry Bench 2024, Klaviyo Index 2024, LinkedIn B2B Bench 2024,
// Tinuiti DTC report 2024, Triple Whale benchmarks 2024.
// `audiences` flags which audience types the channel is appropriate for:
//   b2b   = professional decision-makers (no Meta/TikTok consumer noise)
//   b2c   = end consumers (no LinkedIn — too expensive vs reach)
//   b2b2c = hybrid / both worlds → all channels relevant
const CHANNELS = [
  { id: 'gsearch',  name: 'Google Search',         sat: 80000, ceiling: 600000, base: 7.5, carry: 0.10, hue: '#131022', audiences: ['b2b','b2b2c','b2c'] },
  { id: 'gpmax',    name: 'Google Performance Max',sat: 60000, ceiling: 330000, base: 5.5, carry: 0.10, hue: '#3E0CB7', audiences: ['b2b','b2b2c','b2c'] },
  { id: 'meta',     name: 'Meta Ads',              sat: 70000, ceiling: 350000, base: 5.0, carry: 0.15, hue: '#8D0AF5', audiences: ['b2b2c','b2c'] },
  { id: 'linkedin', name: 'LinkedIn Ads',          sat: 45000, ceiling: 140000, base: 3.1, carry: 0.20, hue: '#2F2748', audiences: ['b2b','b2b2c'] },
  { id: 'tiktok',   name: 'TikTok',                sat: 50000, ceiling: 200000, base: 4.0, carry: 0.20, hue: '#FD89FF', audiences: ['b2b2c','b2c'] },
  { id: 'seo',      name: 'SEO (content)',         sat: 25000, ceiling: 140000, base: 5.6, carry: 0.60, hue: '#6e6a85', audiences: ['b2b','b2b2c','b2c'] },
  { id: 'email',    name: 'Email (Klaviyo)',       sat: 10000, ceiling: 120000, base: 12.0,carry: 0.30, hue: '#c576f0', audiences: ['b2b','b2b2c','b2c'] },
  { id: 'aff',      name: 'Affiliés / influence',  sat: 35000, ceiling: 175000, base: 5.0, carry: 0.25, hue: '#a40fa9', audiences: ['b2b2c','b2c'] },
];
function channelsForAudience(audience) {
  if (!audience) return CHANNELS;
  return CHANNELS.filter(c => !c.audiences || c.audiences.includes(audience));
}
const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map(c => [c.id, c]));

// Default monthly spend allocation for demo
const DEFAULT_SPEND = {
  gsearch: 18000, gpmax: 9000, meta: 22000, linkedin: 7000,
  tiktok: 4000, seo: 6000, email: 1800, aff: 4500,
};

// ── Industry benchmarks ────────────────────────────────────────────────────
// Median performance per industry — Swiss SME context (CHF 1M – 20M revenue band).
// Sources cross-referenced:
//   conv (MQL → SQL):    HubSpot State of Inbound 2024 ; Capterra B2B Funnel Bench 2023
//   closing (SQL → won): Pacific Crest SaaS Survey 2023 ; Salesforce State of Sales 2024
//   response (min):       Oldroyd / Lead Response Management Study 2007 (5-min threshold) ;
//                         Drift 2023 Conversational Marketing Bench (median first reply)
//   panier (annual ACV):  Swisscom Innovation SME 2024 ; OpenView SaaS Bench (SMB tier)
//   arpuMonthly:          panier amorti sur le cycle d'achat réel (SaaS=panier/12,
//                         ecom=panier×achats/mois, services=billable/mois)
//   ltvMult, margin:      Bessemer State of the Cloud 2024 ; KeyBanc SaaS Survey 2023
//   salesCycleDays:       Gartner B2B Buying Journey 2024 ; Salesforce State of Sales
//   aeQuotaCHF:           CSO Insights AE Quota Bench 2024 (median, fully-ramped)
//   aeRampMonths:         Bridge Group SaaS AE Productivity 2023
const INDUSTRIES = {
  saas_b2b:  { id: 'saas_b2b',  name: 'SaaS B2B',                 conv: 0.22, closing: 0.28, response: 35, panier: 4200,  arpuMonthly: 350,   ltvMult: 3.6, margin: 0.75, salesCycleDays: 60,  aeQuotaCHF: 600000,  aeRampMonths: 4 },
  services:  { id: 'services',  name: 'Services B2B / agence',    conv: 0.18, closing: 0.32, response: 45, panier: 8500,  arpuMonthly: 708,   ltvMult: 2.4, margin: 0.45, salesCycleDays: 75,  aeQuotaCHF: 850000,  aeRampMonths: 3 },
  ecom:      { id: 'ecom',      name: 'E-commerce / DTC',         conv: 0.12, closing: 0.42, response: 60, panier: 220,   arpuMonthly: 55,    ltvMult: 2.8, margin: 0.55, salesCycleDays: 7,   aeQuotaCHF: 0,       aeRampMonths: 0 },
  industrial:{ id: 'industrial',name: 'Industrie / manufacturing',conv: 0.15, closing: 0.24, response: 90, panier: 28000, arpuMonthly: 2333,  ltvMult: 1.8, margin: 0.30, salesCycleDays: 120, aeQuotaCHF: 1400000, aeRampMonths: 6 },
  finsvc:    { id: 'finsvc',    name: 'Services financiers',      conv: 0.16, closing: 0.21, response: 25, panier: 3200,  arpuMonthly: 267,   ltvMult: 4.2, margin: 0.65, salesCycleDays: 90,  aeQuotaCHF: 700000,  aeRampMonths: 5 },
  health:    { id: 'health',    name: 'Healthcare / MedTech',     conv: 0.14, closing: 0.26, response: 50, panier: 12000, arpuMonthly: 1000,  ltvMult: 3.0, margin: 0.55, salesCycleDays: 105, aeQuotaCHF: 900000,  aeRampMonths: 5 },
};
const INDUSTRY_ORDER = ['saas_b2b', 'services', 'ecom', 'industrial', 'finsvc', 'health'];
// ── Onboarding reference data ──────────────────────────────────────────────
// cacIndex   : multiplier on cost-of-acquisition vs Switzerland baseline (1.0)
// salaryAdj  : multiplier on RevOps / sales-ops labour cost
// currency   : informational — platform reference currency stays CHF
const COUNTRIES = [
  { id: 'CH',  name: 'Suisse',                flag: '🇨🇭', currency: 'CHF', cacIndex: 1.00, salaryAdj: 1.00, responseAdj: 1.00, panierAdj: 1.00 },
  { id: 'EU',  name: 'Union européenne',      flag: '🇪🇺', currency: 'EUR', cacIndex: 0.78, salaryAdj: 0.75, responseAdj: 1.10, panierAdj: 0.85 },
  { id: 'UK',  name: 'Royaume-Uni',           flag: '🇬🇧', currency: 'GBP', cacIndex: 0.95, salaryAdj: 0.88, responseAdj: 0.95, panierAdj: 0.92 },
  { id: 'US',  name: 'États-Unis',            flag: '🇺🇸', currency: 'USD', cacIndex: 1.35, salaryAdj: 1.20, responseAdj: 0.85, panierAdj: 1.05 },
  { id: 'GLB', name: 'International / autre', flag: '🌐', currency: 'CHF', cacIndex: 1.00, salaryAdj: 0.95, responseAdj: 1.00, panierAdj: 0.90 },
];

// ── Lifecycle / company-maturity profiles ─────────────────────────────────
// Drives benchmark targets, RevOps response-curve saturation, recommended
// payback windows, and the qualitative tone of recommendations.
//   targetMult           : multiplier on industry-median conv/closing targets (mature is stricter)
//   responseTarget       : minutes — what counts as "good" first response
//   cacPaybackTargetMo   : healthy CAC payback ceiling for this stage
//   ltvCacTarget         : healthy LTV:CAC ratio for this stage
//   recoverySatMult      : multiplier on the RevOps recovery-curve saturation
//   recommendedBudgetMult: × saturation → suggested RevOps budget (how aggressively to invest)
//   marginOverride       : if set, overrides industry margin for LTV / payback math
const LIFECYCLES = {
  launch: {
    id: 'launch', name: 'Launch', short: '0 – 2 ans', icon: '◷',
    pitch: 'Vous bâtissez le product-market fit. Croissance brute > efficacité.',
    targetMult: 0.80,
    responseTarget: 10,
    cacPaybackTargetMo: 18,
    ltvCacTarget: 2.0,
    recoverySatMult: 0.70,
    recommendedBudgetMult: 1.00, // ≈ 63% recovery — préserver le cash
    marginOverride: null,
  },
  growth: {
    id: 'growth', name: 'Growth', short: '2 – 5 ans', icon: '◐',
    pitch: 'Vous accélérez. Équilibre vitesse et efficacité.',
    targetMult: 1.00,
    responseTarget: 5,
    cacPaybackTargetMo: 12,
    ltvCacTarget: 3.0,
    recoverySatMult: 1.00,
    recommendedBudgetMult: 1.50, // ≈ 78% recovery
    marginOverride: null,
  },
  mature: {
    id: 'mature', name: 'Mature', short: '5+ ans', icon: '●',
    pitch: 'Vous optimisez. Efficacité, rétention et LTV.',
    targetMult: 1.10,
    responseTarget: 5,
    cacPaybackTargetMo: 9,
    ltvCacTarget: 4.0,
    recoverySatMult: 1.30,
    recommendedBudgetMult: 2.50, // ≈ 92% recovery — pousser l'optimisation
    marginOverride: null,
  },
};
const LIFECYCLE_ORDER = ['launch', 'growth', 'mature'];

// ── RevOps Sales & Marketing reinvestment benchmarks ───────────────────────
// % of top-line typically allocated to S&M, by industry × lifecycle.
// Calibrated for profitable / SME-stage businesses (not burn-driven VC scale-ups).
//
// Sources cross-referenced:
//   SaaS:        SaaS Capital Survey 2024 (median private SaaS, $1–20M ARR) ;
//                Bessemer State of the Cloud 2024 ; OpenView SaaS Benchmarks 2023
//   Services:    Hinge Marketing High-Growth Pro Services Study 2024 ;
//                AMA / SoDA agency P&L bench
//   E-commerce:  Shopify Plus DTC P&L 2024 ; Common Thread Collective bench
//   Industrial:  Gartner B2B Marketing Spend Survey 2024 (manufacturing tier)
//   FinSvc:      Deloitte FS Marketing Effectiveness 2024
//   Health:      McKinsey MedTech Commercial 2023
//
// { rec: recommended starting point, low: efficient floor, high: aggressive growth }
const SM_REINVESTMENT_BENCHMARKS = {
  // SaaS B2B — SME profile, "Rule of 40" minded (not 50%+ burn-stage VCs).
  // Bessemer growth-stage public benchmark is ~50% S&M; we anchor below that for SMB.
  saas_b2b:   { launch: { low: 0.35, rec: 0.50, high: 0.70 },
                growth: { low: 0.22, rec: 0.35, high: 0.50 },
                mature: { low: 0.10, rec: 0.18, high: 0.28 } },
  // Services / agencies — biz-dev heavy on referrals, lower paid spend.
  services:   { launch: { low: 0.08, rec: 0.15, high: 0.22 },
                growth: { low: 0.05, rec: 0.10, high: 0.15 },
                mature: { low: 0.03, rec: 0.06, high: 0.10 } },
  // DTC / E-com — paid acquisition heavy. Shopify Plus median ~20% on paid alone.
  ecom:       { launch: { low: 0.18, rec: 0.28, high: 0.40 },
                growth: { low: 0.12, rec: 0.20, high: 0.30 },
                mature: { low: 0.06, rec: 0.12, high: 0.18 } },
  // Industrial / manufacturing — lowest marketing intensity, long cycles.
  industrial: { launch: { low: 0.06, rec: 0.12, high: 0.18 },
                growth: { low: 0.04, rec: 0.08, high: 0.12 },
                mature: { low: 0.02, rec: 0.05, high: 0.08 } },
  // Financial services — regulated, brand-led, mid intensity.
  finsvc:     { launch: { low: 0.10, rec: 0.18, high: 0.28 },
                growth: { low: 0.06, rec: 0.12, high: 0.18 },
                mature: { low: 0.04, rec: 0.07, high: 0.12 } },
  // Healthcare / MedTech — heavy commercial spend on field sales + regulatory marketing.
  health:     { launch: { low: 0.12, rec: 0.22, high: 0.32 },
                growth: { low: 0.08, rec: 0.16, high: 0.24 },
                mature: { low: 0.05, rec: 0.10, high: 0.16 } },
};
function getReinvestmentBenchmark(industryId, lifecycleId) {
  const ind = SM_REINVESTMENT_BENCHMARKS[industryId] || SM_REINVESTMENT_BENCHMARKS.saas_b2b;
  return ind[lifecycleId] || ind.growth;
}

// ── Paid Media share of S&M ─────────────────────────────────────────────
// What % of total Sales & Marketing budget is actually paid media (Google,
// Meta, LinkedIn, programmatic…). The rest funds the team (salaries, ops),
// content production, tooling stack, agency fees, events.
//
// Cross-referenced: Gartner CMO Spend Survey 2024, HubSpot State of
// Marketing 2024, Forrester B2B Marketing Mix 2024.
//   Launch        : higher paid share — no brand equity yet, must buy reach
//   Acceleration  : balanced — maximize ROAS, scale what works
//   Defense       : lower paid share — brand & retention do the lifting
const PAID_MEDIA_SHARE_OF_SM = {
  saas_b2b:   { launch: 0.45, growth: 0.40, mature: 0.32 },
  services:   { launch: 0.30, growth: 0.25, mature: 0.18 },
  ecom:       { launch: 0.65, growth: 0.60, mature: 0.50 },
  industrial: { launch: 0.25, growth: 0.20, mature: 0.15 },
  finsvc:     { launch: 0.35, growth: 0.30, mature: 0.22 },
  health:     { launch: 0.30, growth: 0.25, mature: 0.18 },
};
function getPaidMediaShare(industryId, lifecycleId) {
  const ind = PAID_MEDIA_SHARE_OF_SM[industryId] || PAID_MEDIA_SHARE_OF_SM.saas_b2b;
  return ind[lifecycleId] || ind.growth;
}

// ── Blended ROAS targets ────────────────────────────────────────────────
// Industry-realistic blended return on paid media spend (revenue÷paid).
// Defaults to 5× (500%) for SaaS B2B in growth phase.
const BLENDED_ROAS_TARGET = {
  saas_b2b:   { launch: 3.5, growth: 5.0, mature: 6.5 },
  services:   { launch: 4.0, growth: 5.5, mature: 7.0 },
  ecom:       { launch: 2.8, growth: 4.0, mature: 5.5 },
  industrial: { launch: 3.0, growth: 4.5, mature: 6.0 },
  finsvc:     { launch: 3.5, growth: 5.0, mature: 6.5 },
  health:     { launch: 3.0, growth: 4.5, mature: 6.0 },
};
function getBlendedRoasTarget(industryId, lifecycleId) {
  const ind = BLENDED_ROAS_TARGET[industryId] || BLENDED_ROAS_TARGET.saas_b2b;
  return ind[lifecycleId] || ind.growth;
}

// ── Pre-made geographic Markets ───────────────────────────────────────────
// Used by the Revenue Simulator to project top-line revenue under different
// geographic mixes. Each market specifies the addressable opportunity, current
// penetration, CAC multiplier vs Switzerland baseline, retention adjustment,
// and an annual market-growth rate.
const MARKETS = {
  vaud: {
    id: 'vaud', name: 'Canton de Vaud', flag: '🇨🇭',
    short: 'Vaud · marche test',
    population: 822000,
    addressableCHF: 18_000_000,    // annual TAM CHF for the SME segment (illustrative)
    penetration:   0.024,          // current share of addressable
    competitiveIntensity: 'low',
    cacMultiplier: 0.85,
    retentionAdj:  1.08,           // local proximity = stickier
    organicMonthlyShare: 0.18,     // % of new customers acquired organically
    growthRate:    0.012,          // annual market growth
    pitch: 'Marché test étroit — CAC bas, rétention élevée, plafond rapide.',
  },
  switzerland: {
    id: 'switzerland', name: 'Suisse', flag: '🇨🇭',
    short: 'CH · coeur de marché',
    population: 8700000,
    addressableCHF: 240_000_000,
    penetration:   0.0085,
    competitiveIntensity: 'medium',
    cacMultiplier: 1.00,
    retentionAdj:  1.00,
    organicMonthlyShare: 0.12,
    growthRate:    0.018,
    pitch: 'Marché cœur — CAC standard, compétition modérée, marges saines.',
  },
  others: {
    id: 'others', name: 'International (DACH, FR, autres)', flag: '🌐',
    short: 'Autres · expansion',
    population: 0, // n/a for international aggregate
    addressableCHF: 1_400_000_000,
    penetration:   0.0004,
    competitiveIntensity: 'high',
    cacMultiplier: 1.45,
    retentionAdj:  0.85,
    organicMonthlyShare: 0.06,
    growthRate:    0.045,
    pitch: 'Expansion — CAC plus cher, ramp-up retention, plafond élevé.',
  },
};
const MARKET_ORDER = ['vaud', 'switzerland', 'others'];

// ── RFM customer segments ────────────────────────────────────────────────
// Standard 4-segment RFM mix. monthlyValueMult is applied on the scenario panier
// to get monthly contribution per active customer in that segment.
// retentionMonthly is the probability a customer stays in the active base from
// month N to N+1 (i.e. 1 - monthly churn).
const RFM_SEGMENTS = [
  { id: 'champions', name: 'Champions',  hint: 'Récents, fréquents, gros panier',
    share: 0.15, monthlyValueMult: 1.80, retentionMonthly: 0.97, hue: '#8D0AF5' },
  { id: 'loyal',     name: 'Loyal',       hint: 'Récurrents, panier moyen',
    share: 0.35, monthlyValueMult: 1.00, retentionMonthly: 0.93, hue: '#3E0CB7' },
  { id: 'casual',    name: 'Casual',      hint: '1–2 achats, irréguliers',
    share: 0.35, monthlyValueMult: 0.55, retentionMonthly: 0.82, hue: '#FD89FF' },
  { id: 'at_risk',   name: 'At-risk',     hint: 'Inactifs > 90j',
    share: 0.15, monthlyValueMult: 0.25, retentionMonthly: 0.55, hue: '#6e6a85' },
];

// Default simulator state
const DEFAULT_SIMULATOR = {
  marketMix: { vaud: 0.45, switzerland: 0.45, others: 0.10 },  // share of channel budget allocated per market
  rfmShares: RFM_SEGMENTS.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {}),
  retentionLift: 1.0,        // multiplier on each segment's monthly retention (RevOps efficacy)
  newCustomerLift: 1.0,      // multiplier on conversion of channel reach into customers
  horizonMonths: 12,
  startingCustomers: 320,    // existing base, distributed across RFM at start
};
const SIZE_BANDS = [
  { id: 'micro', label: '1 – 10',     name: 'Micro / fondateur',     min: 1,   max: 10,   benchTeam: 1 },
  { id: 'small', label: '11 – 50',    name: 'PME en croissance',     min: 11,  max: 50,   benchTeam: 4 },
  { id: 'mid',   label: '51 – 200',   name: 'ETI early-stage',       min: 51,  max: 200,  benchTeam: 12 },
  { id: 'large', label: '201 – 500',  name: 'ETI mature',            min: 201, max: 500,  benchTeam: 28 },
  { id: 'xl',    label: '500+',       name: 'Grande entreprise',     min: 501, max: 10000,benchTeam: 60 },
];
const REVENUE_BANDS = [
  { id: 'r0',  label: '< CHF 250k',         min: 100000,   max: 250000,   midpoint: 180000 },
  { id: 'r1',  label: 'CHF 250k – 1M',       min: 250000,   max: 1000000,  midpoint: 600000 },
  { id: 'r2',  label: 'CHF 1M – 5M',         min: 1000000,  max: 5000000,  midpoint: 2400000 },
  { id: 'r3',  label: 'CHF 5M – 20M',        min: 5000000,  max: 20000000, midpoint: 9000000 },
  { id: 'r4',  label: 'CHF 20M – 100M',      min: 20000000, max: 100000000,midpoint: 45000000 },
  { id: 'r5',  label: '> CHF 100M',          min: 100000000,max: 500000000,midpoint: 180000000 },
];
const PRIORITIES = [
  { id: 'response_time', label: 'Réduire le temps de réponse', hint: 'Vos leads attendent trop longtemps avant un premier contact.' },
  { id: 'qualification', label: 'Mieux qualifier les leads',    hint: 'Trop de leads non-qualifiés saturent l\'équipe.' },
  { id: 'closing',       label: 'Améliorer le taux de closing', hint: 'Les opportunités stagnent ou se perdent en fin de cycle.' },
  { id: 'capacity',      label: 'Capacité de l\'équipe',         hint: 'L\'équipe ne suit plus le volume de leads entrants.' },
];

// ── RevOps Maturity assessment ──────────────────────────────────────────
// Six dimensions, each scored 0–4 → normalised to 0–100.
// The score drives: recommendation tone, recovery saturation leverage,
// and the "foundation vs optimisation" framing of next actions.
const MATURITY_DIMENSIONS = [
  {
    id: 'data',
    label: 'Fondation données & CRM',
    hint: 'Où vivent vos données commerciales aujourd\'hui ?',
    weight: 1.2,
    options: [
      { value: 0, label: 'Aucun CRM',                  caption: 'Excel / Sheets, mémoire des commerciaux' },
      { value: 1, label: 'CRM basique',                caption: 'Pipedrive / HubSpot Free, hygiène irrégulière' },
      { value: 2, label: 'CRM bien instrumenté',       caption: 'Champs structurés, dashboards, owners clairs' },
      { value: 3, label: 'Source de vérité unique',     caption: 'CRM + entrepôt (BigQuery / Snowflake), Reverse-ETL' },
      { value: 4, label: 'Stack data-first',           caption: 'CDP + data warehouse + activation temps réel' },
    ],
  },
  {
    id: 'leadops',
    label: 'Opérations leads',
    hint: 'Comment vos leads sont-ils routeés et qualifiés ?',
    weight: 1.1,
    options: [
      { value: 0, label: 'Manuel',                     caption: 'Email partagé, ping Slack ad hoc' },
      { value: 1, label: 'Routage manuel + SLA flou',  caption: 'Tour de rôle, pas d\'escalation' },
      { value: 2, label: 'Routage automatisé',         caption: 'Règles round-robin / par segment, SLA défini' },
      { value: 3, label: 'Scoring + routage dynamique',caption: 'Lead score, enrichment, ICP filter automatique' },
      { value: 4, label: 'IA-augmenté',                caption: 'Scoring prédictif, suggestions auto, auto-handoff' },
    ],
  },
  {
    id: 'attribution',
    label: 'Attribution & mesure',
    hint: 'Comment savez-vous quelles dépenses fonctionnent ?',
    weight: 1.3,
    options: [
      { value: 0, label: 'Aucune',                     caption: '"On voit ce qui marche au feeling"' },
      { value: 1, label: 'Last-click platform',        caption: 'Reporting natif Google / Meta uniquement' },
      { value: 2, label: 'Multi-touch basique',        caption: 'GA4 + UTMs propres, modèle linéaire' },
      { value: 3, label: 'Multi-touch + réconciliation CRM', caption: 'Tracking server-side, attribution CRM' },
      { value: 4, label: 'MMM / incrementality',       caption: 'Modélisation économétrique, geo-experiments' },
    ],
  },
  {
    id: 'alignment',
    label: 'Alignement Sales × Marketing',
    hint: 'Vos équipes parlent-elles le même langage ?',
    weight: 1.0,
    options: [
      { value: 0, label: 'Siloé',                       caption: 'Métriques différentes, pas de point partagé' },
      { value: 1, label: 'Syncs ponctuels',            caption: 'Réunions mensuelles, définitions floues' },
      { value: 2, label: 'Cadence hebdo + ICP partagé',caption: 'MQL/SQL définis, weekly pipeline review' },
      { value: 3, label: 'SLA croisés + OKR communs',  caption: 'Marketing tenu à un # MQL, Sales à un follow-up' },
      { value: 4, label: 'RevOps unifié',               caption: 'Une seule équipe revenu, P&L commun' },
    ],
  },
  {
    id: 'stack',
    label: 'Stack technologique',
    hint: 'Outils et intégrations en place',
    weight: 0.9,
    options: [
      { value: 0, label: 'Ad hoc',                     caption: 'Outils isolés, exports manuels' },
      { value: 1, label: 'Point solutions',            caption: 'CRM + email tool, pas d\'intégrations' },
      { value: 2, label: 'Stack intégré',              caption: 'Zapier / native syncs, automation basique' },
      { value: 3, label: 'Stack orchestré',            caption: 'iPaaS, workflows complexes, monitoring' },
      { value: 4, label: 'Stack optimisé',             caption: 'Coverage 95%+, audit régulier, ROI mesuré' },
    ],
  },
  {
    id: 'reporting',
    label: 'Cadence de pilotage',
    hint: 'À quelle fréquence pilotez-vous votre funnel ?',
    weight: 0.9,
    options: [
      { value: 0, label: 'Aucune',                     caption: 'Pas de revue récurrente' },
      { value: 1, label: 'Trimestrielle',              caption: 'Board / QBR uniquement' },
      { value: 2, label: 'Mensuelle',                  caption: 'Reporting mensuel, ajustements lents' },
      { value: 3, label: 'Hebdomadaire',               caption: 'Weekly pipeline + spend review' },
      { value: 4, label: 'Temps réel',                 caption: 'Dashboards live, alertes, daily standups' },
    ],
  },
];

// Compute the 0–100 maturity score (weighted).
// Returns { score, tier, dimensions[] } where dimensions[] keeps per-axis state.
function computeRevopsScore(maturity) {
  if (!maturity) return { score: 0, tier: 'foundation', dimensions: [] };
  let num = 0, denom = 0;
  const dimensions = MATURITY_DIMENSIONS.map(d => {
    const value = maturity[d.id];
    const has = Number.isFinite(value);
    if (has) { num += value * d.weight; denom += 4 * d.weight; }
    return { ...d, value: has ? value : null };
  });
  const score = denom > 0 ? Math.round((num / denom) * 100) : 0;
  const tier = score < 30 ? 'foundation'
             : score < 55 ? 'building'
             : score < 75 ? 'optimising'
             : 'leading';
  return { score, tier, dimensions };
}

const MATURITY_TIERS = {
  foundation: { label: 'Foundation',  band: '0–29',   hint: 'Construisez les bases avant d\'amplifier le mix média.', tone: 'bad' },
  building:   { label: 'Building',    band: '30–54',  hint: 'Les fondations sont là — industrialisez les opérations.', tone: 'warn' },
  optimising: { label: 'Optimising',  band: '55–74',  hint: 'Stack mature — cap sur l\'attribution et la rétention.',  tone: 'accent' },
  leading:    { label: 'Leading',     band: '75–100', hint: 'Top quartile — défendez votre avance, testez l\'IA.',     tone: 'ok' },
};

// Default empty maturity (all null = unanswered)
const EMPTY_MATURITY = MATURITY_DIMENSIONS.reduce((acc, d) => { acc[d.id] = null; return acc; }, {});

// Default empty profile (pre-onboarding)
const EMPTY_PROFILE = {
  industry: null,
  country: null,
  lifecycle: null,
  sizeBand: null,
  revenueBand: null,
  caAnnuel: null,
  salesTeam: null,
  currentRevops: 0,
  priority: null,
  maturity: { ...EMPTY_MATURITY },
  onboardingCompleted: false,
};

// Derive a baseline lead volume from CA + industry median (per month).
function deriveLeads(caAnnuel, industryId) {
  const ind = INDUSTRIES[industryId] || INDUSTRIES.saas_b2b;
  const monthly = caAnnuel / 12;
  return Math.max(10, Math.round(monthly / (ind.conv * ind.closing * ind.panier)));
}

// Default calculator scenario
const DEFAULT_SCENARIO_INPUTS = {
  industry: 'saas_b2b',
  country: 'CH',
  lifecycle: 'growth',
  caAnnuel: 1200000,
  leadsMois: 480,
  conversion: 0.18,
  closing: 0.22,
  panier: 1850,
  responseTimeMin: 47,
  equipe: 4,
  revopsBudget: 4500,
};

// ── Helpers ────────────────────────────────────────────────────────────────
const cn = (...xs) => xs.filter(Boolean).join(' ');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Primitives ─────────────────────────────────────────────────────────────
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full, className, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-[15px]',
  };
  const variants = {
    primary: 'bg-ink text-paper hover:bg-[#26204a]',
    accent:  'bg-accent text-white hover:bg-[#7308d4]',
    pink:    'bg-pink text-ink hover:bg-[#ffa6ff]',
    ghost:   'bg-transparent text-ink hover:bg-ink/[0.04] border border-line',
    quiet:   'bg-transparent text-mute hover:text-ink hover:bg-ink/[0.04]',
    danger:  'bg-bad text-white hover:bg-[#a01b1b]',
    light:   'bg-paper2 text-ink hover:bg-[#e3def0]',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], full && 'w-full', className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}

function Input({ label, hint, prefix, suffix, className, error, ...rest }) {
  const id = useRef('in_' + uid()).current;
  return (
    <label htmlFor={id} className={cn('block', className)}>
      {label && <div className="text-[12px] font-medium text-mute mb-1.5 tracking-tight">{label}</div>}
      <div className={cn('flex items-center h-11 bg-paper border hair rounded-none transition-colors',
                          'focus-within:border-ink', error && 'border-bad')}>
        {prefix && <span className="pl-3 text-[13px] text-mute mono">{prefix}</span>}
        <input id={id} className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-mute/60 num" {...rest} />
        {suffix && <span className="pr-3 text-[13px] text-mute mono">{suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-mute mt-1">{hint}</div>}
    </label>
  );
}

function Card({ children, className, padded = true, hover }) {
  return (
    <div className={cn('bg-paper border hair', hover && 'transition-colors hover:border-ink/30', padded && 'p-5', className)}>
      {children}
    </div>
  );
}

function Badge({ children, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-paper2 text-ink',
    accent:  'bg-accentSoft text-accent',
    pink:    'bg-pinkSoft text-[#a40fa9]',
    ok:      'bg-[#e6f3e8] text-ok',
    warn:    'bg-[#fdf3e3] text-warn',
    bad:     'bg-[#fbe7e7] text-bad',
    ink:     'bg-ink text-paper',
    line:    'border hair text-ink',
  };
  return <span className={cn('inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium tracking-tight uppercase', tones[tone], className)}>{children}</span>;
}

function Divider({ className }) {
  return <div className={cn('border-t hair', className)} />;
}

function Spinner({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('spin', className)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Animated number — fades / slides whenever value changes
function AnimNum({ value, format = fmtNum, className }) {
  const [k, setK] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) { setK(x => x + 1); prev.current = value; }
  }, [value]);
  return <span key={k} className={cn('num-anim num inline-block', className)}>{format(value)}</span>;
}

// Range-slider field with label, value display, optional benchmark tick + hint.
function FieldSlider({ label, value, min, max, step = 1, onChange, format, hint, accent, benchmark, benchmarkLabel }) {
  const benchPct = benchmark != null ? clamp((benchmark - min) / (max - min), 0, 1) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <div className="text-[12px] font-semibold text-ink tracking-tight">{label}</div>
        <div className="display text-[15px] font-semibold tracking-tight num">{format ? format(value) : value}</div>
      </div>
      <div className="relative">
        <input type="range" className={accent ? 'accent' : ''} min={min} max={max} step={step} value={value}
               onChange={e => onChange(Number(e.target.value))} />
        {benchPct != null && (
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-px h-3 bg-accent/70"
                style={{ left: `${benchPct * 100}%` }}
                title={`Benchmark · ${benchmarkLabel || ''}`} />
        )}
      </div>
      {hint && (
        <div className="text-[10.5px] text-mute mt-1 flex items-center gap-1.5">
          {benchmark != null && <span className="w-1 h-1 rounded-full bg-accent" />}
          {hint}
        </div>
      )}
    </div>
  );
}

// Measures the width of its container and renders its children with that
// numeric pixel width. Pattern: <MeasuredWidth className="h-[180px]">{(w) => <Chart width={w} .../>}</MeasuredWidth>
// Replacement for Recharts' ResponsiveContainer (which can fail to size in some sandboxed environments).
function MeasuredWidth({ children, className, fallback = 600 }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width || 0);
    measure();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure); ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
  }, []);
  return <div ref={ref} className={cn('w-full', className)}>{w > 0 ? children(Math.max(120, Math.floor(w))) : null}</div>;
}

// Toast bus
const ToastCtx = React.createContext({ toast: () => {} });
function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((msg, opts = {}) => {
    const id = uid();
    setItems(s => [...s, { id, msg, tone: opts.tone || 'neutral' }]);
    setTimeout(() => setItems(s => s.filter(t => t.id !== id)), opts.duration || 2400);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {items.map(t => (
          <div key={t.id} className={cn('toast px-4 h-11 inline-flex items-center text-[13px] font-medium tracking-tight',
            t.tone === 'accent' ? 'bg-accent text-white' : 'bg-ink text-paper')}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ── Expose globally ────────────────────────────────────────────────────────
Object.assign(window, {
  // libs
  React, useState, useEffect, useMemo, useRef, useCallback,
  // format / utils
  fmtCHF, fmtCHFShort, fmtNum, fmtPct, cn, clamp, uid,
  fmtMoney, fmtMoneyShort, CURRENCY_META,
  // domain
  PLANS, PLAN_ORDER, planRank, planAllows,
  CHANNELS, CHANNEL_BY_ID, DEFAULT_SPEND, DEFAULT_SCENARIO_INPUTS, channelsForAudience,
  INDUSTRIES, INDUSTRY_ORDER, deriveLeads,
  COUNTRIES, SIZE_BANDS, REVENUE_BANDS, PRIORITIES, EMPTY_PROFILE,
  LIFECYCLES, LIFECYCLE_ORDER,
  SM_REINVESTMENT_BENCHMARKS, getReinvestmentBenchmark,
  PAID_MEDIA_SHARE_OF_SM, getPaidMediaShare,
  BLENDED_ROAS_TARGET, getBlendedRoasTarget,
  MARKETS, MARKET_ORDER, RFM_SEGMENTS, DEFAULT_SIMULATOR,
  MATURITY_DIMENSIONS, MATURITY_TIERS, EMPTY_MATURITY, computeRevopsScore,
  // primitives
  Button, Input, Card, Badge, Divider, Spinner, AnimNum, FieldSlider, MeasuredWidth,
  ToastProvider, useToast,
});
