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
const CHANNELS = [
  { id: 'gsearch',  name: 'Google Search',        sat:  30000, ceiling: 156000, base: 5.2, carry: 0.10, hue: '#131022' },
  { id: 'gpmax',    name: 'Google Performance Max',sat: 22000, ceiling:  92400, base: 4.2, carry: 0.10, hue: '#3E0CB7' },
  { id: 'meta',     name: 'Meta Ads',             sat:  28000, ceiling: 106400, base: 3.8, carry: 0.15, hue: '#8D0AF5' },
  { id: 'linkedin', name: 'LinkedIn Ads',         sat:  18000, ceiling:  43200, base: 2.4, carry: 0.20, hue: '#2F2748' },
  { id: 'tiktok',   name: 'TikTok',               sat:  20000, ceiling:  58000, base: 2.9, carry: 0.20, hue: '#FD89FF' },
  { id: 'seo',      name: 'SEO (content)',        sat:  14000, ceiling:  21000, base: 1.5, carry: 0.60, hue: '#6e6a85' },
  { id: 'email',    name: 'Email (Klaviyo)',      sat:   3500, ceiling:  21000, base: 6.0, carry: 0.30, hue: '#c576f0' },
  { id: 'aff',      name: 'Affiliés / influence', sat:  16000, ceiling:  48000, base: 3.0, carry: 0.25, hue: '#a40fa9' },
];
const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map(c => [c.id, c]));

// Default monthly spend allocation for demo
const DEFAULT_SPEND = {
  gsearch: 18000, gpmax: 9000, meta: 22000, linkedin: 7000,
  tiktok: 4000, seo: 6000, email: 1800, aff: 4500,
};

// ── Industry benchmarks ────────────────────────────────────────────────────
// Median performance per industry (Swiss SME context). Used by the calculator
// to compute leak as the gap between user's actuals and their industry median.
//   ltvMult: average lifetime multiple of first-purchase value (panier × ltvMult × margin = LTV)
//   margin : default gross margin used for LTV / payback when lifecycle profile doesn't override
const INDUSTRIES = {
  saas_b2b:  { id: 'saas_b2b',  name: 'SaaS B2B',                 conv: 0.22, closing: 0.28, response: 35, panier: 4200,  ltvMult: 3.6, margin: 0.75 },
  services:  { id: 'services',  name: 'Services B2B / agence',    conv: 0.18, closing: 0.32, response: 45, panier: 8500,  ltvMult: 2.4, margin: 0.45 },
  ecom:      { id: 'ecom',      name: 'E-commerce / DTC',         conv: 0.12, closing: 0.42, response: 60, panier: 220,   ltvMult: 2.8, margin: 0.55 },
  industrial:{ id: 'industrial',name: 'Industrie / manufacturing',conv: 0.15, closing: 0.24, response: 90, panier: 28000, ltvMult: 1.8, margin: 0.30 },
  finsvc:    { id: 'finsvc',    name: 'Services financiers',      conv: 0.16, closing: 0.21, response: 25, panier: 3200,  ltvMult: 4.2, margin: 0.65 },
  health:    { id: 'health',    name: 'Healthcare / MedTech',     conv: 0.14, closing: 0.26, response: 50, panier: 12000, ltvMult: 3.0, margin: 0.55 },
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
  // domain
  PLANS, PLAN_ORDER, planRank, planAllows,
  CHANNELS, CHANNEL_BY_ID, DEFAULT_SPEND, DEFAULT_SCENARIO_INPUTS,
  INDUSTRIES, INDUSTRY_ORDER, deriveLeads,
  COUNTRIES, SIZE_BANDS, REVENUE_BANDS, PRIORITIES, EMPTY_PROFILE,
  LIFECYCLES, LIFECYCLE_ORDER,
  MATURITY_DIMENSIONS, MATURITY_TIERS, EMPTY_MATURITY, computeRevopsScore,
  // primitives
  Button, Input, Card, Badge, Divider, Spinner, AnimNum, FieldSlider, MeasuredWidth,
  ToastProvider, useToast,
});
