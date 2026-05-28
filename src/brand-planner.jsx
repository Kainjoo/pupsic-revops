// Brand Planner — guided 3-step flow.
// Default home for non-expert users. Editorial / formal tone, IKEA-style clarity.
// Steps:  I. Marché  ·  II. Budget  ·  III. Plan
// Step 3 includes a print stylesheet so "Imprimer le plan" produces a clean brief.

function BrandPlannerScreen({ user, plan, profile, scenarios, mmmSpend, setMMMSpend, go, setMode }) {
  const [step, setStep] = useState(0);

  // ── Step 1: Market mix ───────────────────────────────────────────────
  const [marketMix, setMarketMix] = useState({ vaud: 0.45, switzerland: 0.45, others: 0.10 });

  // CAC / LTV — optional user override. If null, we infer from industry + audience.
  const indDefault = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const [cacKnown,  setCacKnown]  = useState(null);  // null = unknown, number = user-provided CHF
  const [ltvKnown,  setLtvKnown]  = useState(null);

  // ── Step 2: Goals → derived budget ─────────────────────────────────
  // Inverted UX: user states target top-line + % they'll reinvest, system back-solves monthly budget.
  const [targetTopLine, setTargetTopLine] = useState(8_000_000);   // CHF / an
  const [strategy, setStrategy] = useState(STRATEGY_FOR_LIFECYCLE[profile?.lifecycle] || 'acceleration');
  const [audienceType, setAudienceType] = useState(inferAudience(profile?.industry));

  // ── Derived: customer economics from profile ─────────────────────────
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const panier      = scenarios?.[0]?.inputs?.panier ?? ind.panier ?? 1850;
  const arpuMonthly = ind.arpuMonthly ?? (panier / 12);
  // Starting base: derived from current CA → number of active customers it implies.
  // Assume ~70% of CA comes from existing customers (industry blend).
  // arpuYearAvg = arpu * blended segment mult (≈0.85 across RFM mix).
  const startingCustomers = useMemo(() => {
    if (profile?.caAnnuel && arpuMonthly > 0) {
      const blendedYearlyArpu = arpuMonthly * 12 * 0.85; // RFM blend
      const fromCA = (profile.caAnnuel * 0.70) / blendedYearlyArpu;
      return clamp(Math.round(fromCA), 30, 50000);
    }
    return profile?.salesTeam ? profile.salesTeam * 30 : 200;
  }, [profile?.caAnnuel, profile?.salesTeam, arpuMonthly]);

  // Cost of growth: returns S&M total + paid-media subset.
  const cost = useMemo(() => computeCostOfGrowth({
    profile, audienceType, strategy, marketMix, topLine: targetTopLine,
  }), [profile, audienceType, strategy, marketMix, targetTopLine]);

  const monthlyBudget    = cost.costMonthly;       // total S&M / mo
  const paidMediaMonthly = cost.paidMediaMonthly;  // paid media subset / mo

  // Whenever paid-media budget, strategy or audience change, sync mmmSpend.
  useEffect(() => {
    setMMMSpend(allocateBudget(paidMediaMonthly, strategy, audienceType));
  }, [paidMediaMonthly, strategy, audienceType]);

  const sim = useMemo(() => simulateTopLine({
    spendByChannel: mmmSpend,
    marketMix,
    rfmShares: RFM_SEGMENTS.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {}),
    panier,
    arpuMonthly,
    startingCustomers,
    retentionLift: 1.0,
    newCustomerLift: 1.0,
    horizonMonths: 12,
  }), [mmmSpend, marketMix, panier, arpuMonthly, startingCustomers]);

  const next = () => setStep(s => Math.min(2, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <>
      <BrandPlannerPrintStyles />
      <div className="min-h-full flex flex-col bg-paper">
        <DemoBanner />
        <PlannerHeader user={user} go={go} setMode={setMode} step={step} />

        <main className="flex-1 print:block">
          {step === 0 && <StepMarket marketMix={marketMix} setMarketMix={setMarketMix}
                                       cacKnown={cacKnown} setCacKnown={setCacKnown}
                                       ltvKnown={ltvKnown} setLtvKnown={setLtvKnown}
                                       sim={sim} next={next} profile={profile} go={go} />}
          {step === 1 && <StepBudget targetTopLine={targetTopLine} setTargetTopLine={setTargetTopLine}
                                     monthlyBudget={monthlyBudget} cost={cost}
                                     strategy={strategy} setStrategy={setStrategy}
                                     audienceType={audienceType} setAudienceType={setAudienceType}
                                     sim={sim} profile={profile} marketMix={marketMix}
                                     cacKnown={cacKnown} ltvKnown={ltvKnown}
                                     back={back} next={next} />}
          {step === 2 && <StepPlan sim={sim} monthlyBudget={monthlyBudget} marketMix={marketMix}
                                    strategy={strategy} audienceType={audienceType}
                                    cost={cost} cacKnown={cacKnown} ltvKnown={ltvKnown}
                                    mmmSpend={mmmSpend}
                                    profile={profile} panier={panier}
                                    back={back} setMode={setMode} go={go} />}
        </main>

        <Footer />
      </div>
    </>
  );
}

// ── Audience type (B2B / B2B2C / B2C) — affects channel weight multipliers ──
// Industry implies a default audience type, but the user can override.
const AUDIENCE_TYPES = [
  { id: 'b2b',   label: 'B2B',   short: 'Vente entreprise',     pitch: 'Cycles longs · décideurs identifiés · ABM' },
  { id: 'b2b2c', label: 'B2B2C', short: 'Hybride / marketplace',pitch: 'Vente indirecte ou plateforme · mix des deux mondes' },
  { id: 'b2c',   label: 'B2C',   short: 'Vente grand public',    pitch: 'Volume · achat impulsif · brand-driven' },
];
// Per-audience channel multipliers (applied on the strategy base weights, then renormalised).
const AUDIENCE_MULTIPLIERS = {
  b2b:   { gsearch: 1.3, gpmax: 0.6, meta: 0.6, linkedin: 2.8, tiktok: 0.2, seo: 1.5, email: 1.6, aff: 0.9 },
  b2b2c: { gsearch: 1.1, gpmax: 1.0, meta: 1.1, linkedin: 0.9, tiktok: 0.7, seo: 1.1, email: 1.2, aff: 1.1 },
  b2c:   { gsearch: 1.0, gpmax: 1.4, meta: 1.7, linkedin: 0.2, tiktok: 2.0, seo: 0.8, email: 1.0, aff: 1.5 },
};
const INDUSTRY_TO_AUDIENCE = {
  saas_b2b: 'b2b', services: 'b2b', industrial: 'b2b',
  ecom: 'b2c',
  finsvc: 'b2b2c', health: 'b2b2c',
};
function inferAudience(industryId) {
  return INDUSTRY_TO_AUDIENCE[industryId] || 'b2b2c';
}

// ── Channel → enabler taxonomy (PPC / Lead gen ABM / Influencers / Content / Retention) ──
const CHANNEL_ENABLERS = {
  gsearch:  { id: 'ppc',     label: 'PPC' },
  gpmax:    { id: 'ppc',     label: 'PPC' },
  meta:     { id: 'ppc',     label: 'PPC' },
  linkedin: { id: 'leadgen', label: 'Lead gen ABM' },
  tiktok:   { id: 'inf',     label: 'Influenceurs' },
  seo:      { id: 'content', label: 'Content' },
  email:    { id: 'ret',     label: 'Retention' },
  aff:      { id: 'inf',     label: 'Influenceurs' },
};
const ENABLER_ORDER = ['ppc', 'content', 'leadgen', 'inf', 'ret'];
const ENABLER_META = {
  ppc:     { id: 'ppc',     label: 'PPC',           hue: '#131022' },
  content: { id: 'content', label: 'Content',       hue: '#6e6a85' },
  leadgen: { id: 'leadgen', label: 'Lead gen ABM',  hue: '#3E0CB7' },
  inf:     { id: 'inf',     label: 'Influenceurs',  hue: '#FD89FF' },
  ret:     { id: 'ret',     label: 'Retention',     hue: '#8D0AF5' },
};

// ── Cost of Growth — single derived multiplier of top-line ─────────────
// All dimensions feed into one % of top-line that you'll spend on S&M to
// achieve your target. No more plafond/required duality.
//
//   basePct        : industry × lifecycle benchmark (Bessemer/OpenView)
//   audienceMult   : B2C is more expensive than B2B per CHF of revenue
//   strategyMult   : Launch costs more than Defense (acquired base)
//   internationalMult : international markets have higher CAC
//
// All multipliers compound on basePct.
function computeCostOfGrowth({ profile, audienceType, strategy, marketMix, topLine }) {
  const bench = getReinvestmentBenchmark(profile?.industry, profile?.lifecycle);
  const basePct = bench.rec;

  const audienceMult = ({ b2b: 1.00, b2b2c: 1.05, b2c: 1.18 })[audienceType] || 1;
  const strategyMult = ({ launch: 1.12, acceleration: 1.00, defense: 0.82 })[strategy] || 1;
  const intlShare    = marketMix?.others || 0;
  const internationalMult = 1 + intlShare * 0.45;

  const totalPct   = basePct * audienceMult * strategyMult * internationalMult;
  const costAnnual = topLine * totalPct;
  const costMonthly = Math.round((costAnnual / 12) / 100) * 100;

  // Paid-media subset of S&M (the rest funds team, tools, content, agencies).
  // Source: Gartner CMO Spend Survey + HubSpot State of Marketing 2024.
  // Strategy lift: launch buys more paid (no brand), defense relies on retention/brand.
  const paidShareBase = getPaidMediaShare(profile?.industry, profile?.lifecycle);
  const paidStrategyMult = ({ launch: 1.10, acceleration: 1.00, defense: 0.85 })[strategy] || 1;
  const paidShare = clamp(paidShareBase * paidStrategyMult, 0.10, 0.80);
  const paidMediaAnnual  = costAnnual * paidShare;
  const paidMediaMonthly = Math.round((paidMediaAnnual / 12) / 100) * 100;

  // Operations subset = S&M total − paid media
  const opsAnnual  = costAnnual - paidMediaAnnual;
  const opsMonthly = costMonthly - paidMediaMonthly;

  // Industry-realistic blended ROAS target on paid media
  const roasTarget = getBlendedRoasTarget(profile?.industry, profile?.lifecycle);

  return {
    basePct, audienceMult, strategyMult, internationalMult, intlShare,
    totalPct, costAnnual, costMonthly, bench,
    paidShare, paidMediaAnnual, paidMediaMonthly,
    opsAnnual, opsMonthly,
    roasTarget,
  };
}

// ── Channel allocation strategies — anchored to lifecycle stage ────────
// Launch (startup):       mix perf + awareness → capture premiers clients
// Acceleration (scaleup): heavy performance    → maximise ROAS pendant la scale
// Defense (mature):       retention + brand    → protection des parts de marché
const STRATEGIES = {
  launch: {
    label: 'Lancement', icon: '◐',
    pitch: 'Mix performance + notoriété · capter les premiers clients',
    forLifecycle: 'launch',
    weights: { gsearch: 0.20, gpmax: 0.10, meta: 0.22, linkedin: 0.06, tiktok: 0.10, seo: 0.12, email: 0.08, aff: 0.12 },
  },
  acceleration: {
    label: 'Accélération', icon: '↗',
    pitch: 'Performance pure · maximiser le ROAS pendant la scale',
    forLifecycle: 'growth',
    weights: { gsearch: 0.30, gpmax: 0.15, meta: 0.18, linkedin: 0.06, tiktok: 0.04, seo: 0.07, email: 0.12, aff: 0.08 },
  },
  defense: {
    label: 'Défense', icon: '◍',
    pitch: 'Protection des parts de marché · rétention + brand',
    forLifecycle: 'mature',
    weights: { gsearch: 0.16, gpmax: 0.08, meta: 0.16, linkedin: 0.12, tiktok: 0.06, seo: 0.14, email: 0.18, aff: 0.10 },
  },
};
const STRATEGY_FOR_LIFECYCLE = {
  launch: 'launch', growth: 'acceleration', mature: 'defense',
};
function allocateBudget(total, strategyId, audienceType = 'b2b2c') {
  const baseW = STRATEGIES[strategyId]?.weights || STRATEGIES.acceleration.weights;
  const mult  = AUDIENCE_MULTIPLIERS[audienceType] || AUDIENCE_MULTIPLIERS.b2b2c;
  let sum = 0;
  const adjusted = {};
  for (const c of CHANNELS) {
    const v = (baseW[c.id] || 0) * (mult[c.id] || 1);
    adjusted[c.id] = v;
    sum += v;
  }
  const out = {};
  for (const c of CHANNELS) {
    out[c.id] = sum > 0 ? Math.round((adjusted[c.id] / sum) * total) : 0;
  }
  return out;
}

// ── Solver: given a target annual top-line, back-out the required monthly budget ──
// Uses bisection over [0, ceilingPerMonth]. simulateTopLine is monotone-ish in budget
// (diminishing returns), so 22 iterations converge well within rounding.
function solveBudgetForTopLine({ targetAnnual, ceilingAnnual, marketMix, strategy, panier, startingCustomers }) {
  const ceilingMo = Math.max(0, (ceilingAnnual || 0) / 12);
  const rfmDefault = RFM_SEGMENTS.reduce((a, s) => { a[s.id] = s.share; return a; }, {});

  const evalAt = (monthly) => {
    const spend = allocateBudget(monthly, strategy);
    const out = simulateTopLine({
      spendByChannel: spend, marketMix, rfmShares: rfmDefault,
      panier, startingCustomers,
      retentionLift: 1.0, newCustomerLift: 1.0, horizonMonths: 12,
    });
    return out.totals.totalRev;
  };

  // Baseline (zero spend) — pure existing-base revenue
  const baseline = evalAt(0);
  // Max reachable at the ceiling
  const ceilingRev = evalAt(ceilingMo);

  if (targetAnnual <= baseline) {
    return { monthly: 0, reachable: true, exceedsCeiling: false,
             ceilingMo, baseline, ceilingRev, achievedRev: baseline,
             headroomMo: ceilingMo };
  }
  if (targetAnnual > ceilingRev) {
    // Unreachable within the willingness-to-invest cap
    return { monthly: ceilingMo, reachable: false, exceedsCeiling: true,
             ceilingMo, baseline, ceilingRev, achievedRev: ceilingRev,
             headroomMo: 0 };
  }
  // Bisection
  let lo = 0, hi = ceilingMo;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const rev = evalAt(mid);
    if (rev < targetAnnual) lo = mid; else hi = mid;
  }
  const monthly = Math.round(((lo + hi) / 2) / 100) * 100;
  return { monthly, reachable: true, exceedsCeiling: false,
           ceilingMo, baseline, ceilingRev, achievedRev: evalAt(monthly),
           headroomMo: Math.max(0, ceilingMo - monthly) };
}

// ── Market presets ────────────────────────────────────────────────────
const MARKET_PRESETS = [
  { id: 'local',  label: 'Hyper-local', sub: 'Concentrez sur le canton', mix: { vaud: 0.80, switzerland: 0.18, others: 0.02 } },
  { id: 'ch',     label: 'Suisse first',sub: 'Couverture nationale',     mix: { vaud: 0.30, switzerland: 0.60, others: 0.10 } },
  { id: 'expand', label: 'Expansion',   sub: 'Cap sur l\'international', mix: { vaud: 0.15, switzerland: 0.45, others: 0.40 } },
];

// ── Header (sticky, with Mode Expert toggle) ──────────────────────────
function PlannerHeader({ user, go, setMode, step }) {
  return (
    <header className="border-b hair bg-paper sticky top-0 z-30 print:hidden">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between gap-6">
        <button onClick={() => go('app/plan')} className="-ml-1"><PupsicMark size={18} /></button>

        <div className="hidden md:flex items-center gap-2 mono text-[10.5px] uppercase tracking-[0.08em] text-mute">
          <span className={cn(step >= 0 && 'text-ink font-semibold')}>I. Marché</span>
          <span>—</span>
          <span className={cn(step >= 1 && 'text-ink font-semibold')}>II. Budget</span>
          <span>—</span>
          <span className={cn(step >= 2 && 'text-ink font-semibold')}>III. Plan</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('expert'); go('app/dashboard'); }}
                  className="text-[12px] text-mute hover:text-ink underline underline-offset-4 decoration-line">
            Mode expert →
          </button>
          <button onClick={() => go('app/account')}
                  className="text-[12px] text-ink hover:text-accent">
            {user?.name || user?.email}
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Shared step shell (editorial layout) ──────────────────────────────
// ── Company Context Bar ──────────────────────────────────────────────
// Slim editorial strip that anchors every step in the company's profile.
function CompanyContextBar({ profile, go }) {
  if (!profile?.onboardingCompleted) return null;
  const ind     = INDUSTRIES[profile.industry];
  const country = COUNTRIES.find(c => c.id === profile.country);
  const lc      = LIFECYCLES[profile.lifecycle];
  const score   = computeRevopsScore(profile.maturity);
  const tier    = MATURITY_TIERS[score.tier];
  const items = [
    ind     && { label: 'Industrie',  value: ind.name },
    country && { label: 'Pays',       value: `${country.flag} ${country.name}` },
    lc      && { label: 'Stade',      value: `${lc.icon} ${lc.name}`, sub: lc.short },
    profile.caAnnuel && { label: 'CA / an',  value: fmtCHFShort(profile.caAnnuel) },
    profile.salesTeam && { label: 'Équipe',   value: `${profile.salesTeam} commerciaux` },
    score.score > 0 && { label: 'RevOps Score', value: `${score.score}/100`, sub: tier?.label, tone: tier?.tone },
  ].filter(Boolean);

  return (
    <div className="border hair bg-paper2/40 mb-8 print:hidden">
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-3 items-center">
        {items.map((it, i) => (
          <div key={i}>
            <div className="mono text-[9.5px] uppercase tracking-[0.08em] text-mute">{it.label}</div>
            <div className={cn('text-[12.5px] font-semibold tracking-tight mt-0.5 truncate',
              it.tone === 'ok' && 'text-ok',
              it.tone === 'warn' && 'text-warn',
              it.tone === 'bad' && 'text-bad',
              it.tone === 'accent' && 'text-accent')}>
              {it.value}
              {it.sub && <span className="text-mute font-normal text-[10.5px] ml-1.5">· {it.sub}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-2 border-t hair flex items-center justify-between text-[11px] text-mute">
        <span className="mono uppercase tracking-[0.06em]">Profil entreprise</span>
        <button onClick={() => go('app/onboarding')}
                className="text-mute hover:text-ink underline underline-offset-4 decoration-line">
          Modifier le profil →
        </button>
      </div>
    </div>
  );
}

function StepShell({ chapter, title, lead, profile, go, children, footer }) {
  return (
    <div className="w-full max-w-[1240px] mx-auto px-6 lg:px-12 py-10 lg:py-16">
      <CompanyContextBar profile={profile} go={go} />
      <div className="mb-10">
        <div className="mono text-[10.5px] uppercase tracking-[0.12em] text-accent">Pupsic · Brand plan</div>
        <div className="display text-[34px] lg:text-[44px] font-bold tracking-[-0.025em] leading-[1.05] mt-3 max-w-[820px]">
          <span className="text-mute mr-3">{chapter}.</span>{title}
        </div>
        {lead && (
          <p className="text-[15px] text-mute mt-4 max-w-[680px] leading-relaxed">{lead}</p>
        )}
      </div>
      {children}
      {footer && <div className="mt-10 pt-6 border-t hair flex items-center justify-between print:hidden">{footer}</div>}
    </div>
  );
}

// ── Step 1: Marché ────────────────────────────────────────────────────
function StepMarket({ marketMix, setMarketMix,
                       cacKnown, setCacKnown, ltvKnown, setLtvKnown,
                       sim, next, profile, go }) {
  const ready = Math.abs(Object.values(marketMix).reduce((a, b) => a + b, 0) - 1) < 0.02;
  const applyPreset = (mix) => setMarketMix({ ...mix });

  return (
    <StepShell chapter="I" title="Définissez votre périmètre."
      profile={profile} go={go}
      lead="Un plan de marque commence par une décision géographique. Sélectionnez la répartition de vos efforts d'acquisition entre vos marchés. Vous pourrez l'affiner à l'étape suivante."
      footer={
        <>
          <span />
          <Button variant="primary" size="lg" iconRight={<IconArrowRight size={14} />}
                  onClick={next} disabled={!ready}>
            Étape suivante · Budget
          </Button>
        </>
      }>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
        {/* Left: presets + sliders */}
        <div>
          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Choisir un profil rapide</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8">
            {MARKET_PRESETS.map(p => {
              const active = JSON.stringify(p.mix) === JSON.stringify(marketMix);
              return (
                <button key={p.id} type="button" onClick={() => applyPreset(p.mix)}
                        className={cn('text-left p-4 border transition-colors',
                                      active ? 'border-ink bg-paper2/60' : 'hair hover:border-ink/40')}>
                  <div className="display text-[15px] font-semibold tracking-tight">{p.label}</div>
                  <div className="text-[11.5px] text-mute mt-1">{p.sub}</div>
                  <div className="mt-3 flex items-center gap-3 text-[10.5px] mono uppercase tracking-[0.06em] text-mute">
                    <span>VD {Math.round(p.mix.vaud * 100)}%</span>
                    <span>CH {Math.round(p.mix.switzerland * 100)}%</span>
                    <span>INT {Math.round(p.mix.others * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Ou ajuster manuellement</div>
          <Card padded={false}>
            <div className="p-5 space-y-5">
              {MARKET_ORDER.map(id => {
                const mk = MARKETS[id];
                return (
                  <div key={id}>
                    <FieldSlider
                      label={<span>{mk.flag} {mk.name}</span>}
                      value={Math.round(marketMix[id] * 100)}
                      min={0} max={100} step={1}
                      format={(v) => `${v}%`}
                      accent={id === 'switzerland'}
                      onChange={(v) => setMarketMix(prev => ({ ...prev, [id]: v / 100 }))} />
                    <div className="text-[11px] text-mute mt-1 leading-snug">
                      CAC ×{mk.cacMultiplier.toFixed(2).replace('.', ',')} ·
                      Rétention ×{mk.retentionAdj.toFixed(2).replace('.', ',')} ·
                      TAM {fmtCHFShort(mk.addressableCHF)}
                    </div>
                  </div>
                );
              })}
              <div className="border-t hair pt-3 flex items-center justify-between text-[11px]">
                <span className="mono uppercase tracking-[0.06em] text-mute">Somme</span>
                <span className={cn('num font-semibold',
                  !ready ? 'text-warn' : 'text-ok')}>
                  {(Object.values(marketMix).reduce((a, b) => a + b, 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </Card>

          {/* CAC / LTV optional override */}
          <KnownEconomics profile={profile}
                          cacKnown={cacKnown} setCacKnown={setCacKnown}
                          ltvKnown={ltvKnown} setLtvKnown={setLtvKnown} />
        </div>

        {/* Right: live preview */}
        <PreviewCard title="Aperçu" lead="Mise à jour en temps réel">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <PreviewKPI label="TAM pondéré"
              value={fmtCHFShort(MARKET_ORDER.reduce((a, id) =>
                a + (marketMix[id] || 0) * MARKETS[id].addressableCHF, 0))} />
            <PreviewKPI label="CAC pondéré"
              value={`×${(MARKET_ORDER.reduce((a, id) =>
                a + (marketMix[id] || 0) * MARKETS[id].cacMultiplier, 0)).toFixed(2).replace('.', ',')}`} />
            <PreviewKPI label="Rétention pondérée"
              value={`×${(MARKET_ORDER.reduce((a, id) =>
                a + (marketMix[id] || 0) * MARKETS[id].retentionAdj, 0)).toFixed(2).replace('.', ',')}`} />
            <PreviewKPI label="Marchés actifs"
              value={Object.values(marketMix).filter(v => v > 0.02).length} />
          </div>
          <div className="border-t hair mt-6 pt-5">
            <div className="mono text-[10.5px] uppercase tracking-[0.06em] text-mute mb-3">Répartition</div>
            <div className="space-y-2.5">
              {MARKET_ORDER.map(id => (
                <div key={id} className="grid grid-cols-[1fr_56px] items-center gap-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span>{MARKETS[id].flag}</span>
                    <span className="tracking-tight">{MARKETS[id].name}</span>
                  </div>
                  <div className="h-1.5 bg-line2 relative overflow-hidden">
                    <div className="h-full bg-accent"
                         style={{ width: `${(marketMix[id] || 0) * 100}%`,
                                  transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PreviewCard>
      </div>
    </StepShell>
  );
}

// ── Step 2: Ambition → derived budget ─────────────────────────────────
function StepBudget({ targetTopLine, setTargetTopLine,
                      monthlyBudget, cost, strategy, setStrategy,
                      audienceType, setAudienceType,
                      sim, profile, marketMix,
                      cacKnown, ltvKnown, back, next }) {
  // Update allocation to use paidMediaMonthly
  const allocation = allocateBudget(cost.paidMediaMonthly, strategy, audienceType);
  const strat = STRATEGIES[strategy];

  return (
    <StepShell chapter="II" title="Fixez votre ambition, Pupsic calcule l'investissement."
      profile={profile}
      lead="Indiquez le chiffre d'affaires que vous voulez atteindre sur 12 mois et l'enveloppe maximale que vous êtes prêt à investir pour y arriver. Pupsic back-calcule le budget mensuel requis et l'alloue automatiquement selon votre stratégie."
      footer={
        <>
          <Button variant="ghost" icon={<IconArrowLeft size={14} />} onClick={back}>Retour</Button>
          <Button variant="primary" size="lg" iconRight={<IconArrowRight size={14} />} onClick={next}>
            Étape suivante · Plan
          </Button>
        </>
      }>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
        <div>
          {/* Ambition: target top-line */}
          <Card padded={false} className="mb-3">
            <div className="px-5 py-4 border-b hair">
              <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Top-line cible · 12 mois</div>
              <div className="display text-[14px] tracking-tight mt-1">Quel revenu voulez-vous générer ?</div>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="display text-[52px] font-bold tracking-[-0.025em] text-accent num leading-none">
                  <AnimNum value={targetTopLine} format={fmtCHFShort} />
                </span>
                <span className="text-mute text-[14px] num">/ an</span>
              </div>
              <FieldSlider label="Ambition"
                value={targetTopLine}
                min={500_000} max={30_000_000} step={100_000}
                format={(v) => fmtCHFShort(v)}
                accent
                hint="Glissez pour ajuster votre ambition annuelle."
                onChange={setTargetTopLine} />
            </div>
          </Card>

          {/* Cost of growth — single derived output, no more dual input */}
          <Card padded={false} className="mb-6">
            <div className="px-5 py-4 border-b hair">
              <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Coût de croissance · multiple du top-line</div>
              <div className="display text-[14px] tracking-tight mt-1">Investissement requis pour atteindre votre ambition</div>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="display text-[44px] font-bold tracking-[-0.025em] text-accent num leading-none">
                  <AnimNum value={cost.totalPct * 100} format={(v) => `${v.toFixed(1).replace('.', ',')}%`} />
                </span>
                <span className="text-mute text-[13px]">
                  du top-line · soit <span className="num text-ink font-semibold">{fmtCHFShort(cost.costAnnual)}</span> / an
                  <span className="mx-1.5">·</span>
                  <span className="num">{fmtCHFShort(cost.costMonthly)}</span> / mois
                </span>
              </div>

              {/* Paid vs Ops split — the credibility split */}
              <div className="mt-4 mb-4 p-3 bg-paper2/50 border hair">
                <div className="flex items-center justify-between mb-2">
                  <div className="mono text-[9.5px] uppercase tracking-[0.08em] text-mute">Ventilation du budget S&amp;M</div>
                  <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">
                    Source · Gartner CMO 2024
                  </div>
                </div>
                <div className="h-2 bg-line2 flex overflow-hidden">
                  <div className="h-full bg-accent"
                       style={{ width: `${cost.paidShare * 100}%`, transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                  <div className="h-full bg-ink"
                       style={{ width: `${(1 - cost.paidShare) * 100}%`, transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-accent" />
                      <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Paid media</span>
                    </div>
                    <div className="num text-[13px] font-semibold tracking-tight text-ink mt-0.5">
                      {fmtCHFShort(cost.paidMediaAnnual)}
                      <span className="text-mute text-[10.5px] font-normal ml-1">({Math.round(cost.paidShare * 100)}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-ink" />
                      <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Équipe · outils · contenu</span>
                    </div>
                    <div className="num text-[13px] font-semibold tracking-tight text-ink mt-0.5">
                      {fmtCHFShort(cost.opsAnnual)}
                      <span className="text-mute text-[10.5px] font-normal ml-1">({Math.round((1 - cost.paidShare) * 100)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown — what drives the multiple */}
              <CostBreakdown cost={cost} profile={profile} audienceType={audienceType} strategy={strategy} marketMix={marketMix} />
            </div>
          </Card>

          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Audience cible · qui achète ?</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
            {AUDIENCE_TYPES.map(a => {
              const active = audienceType === a.id;
              const inferred = inferAudience(profile?.industry) === a.id;
              return (
                <button key={a.id} type="button" onClick={() => setAudienceType(a.id)}
                        className={cn('text-left p-4 border transition-colors',
                                      active ? 'border-ink bg-paper2/60' : 'hair hover:border-ink/40')}>
                  <div className="min-h-[20px] mb-1.5">
                    {inferred && <Badge tone="line" className="mono">DÉDUIT</Badge>}
                  </div>
                  <div className="display text-[17px] font-bold tracking-tight">{a.label}</div>
                  <div className="text-[10.5px] mono uppercase tracking-[0.06em] text-mute mt-1">{a.short}</div>
                  <div className="text-[11.5px] text-mute mt-2 leading-snug">{a.pitch}</div>
                </button>
              );
            })}
          </div>

          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Stratégie d'allocation · alignée à votre stade</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
            {Object.entries(STRATEGIES).map(([id, s]) => {
              const active = strategy === id;
              const lc = LIFECYCLES[s.forLifecycle];
              const recommended = STRATEGY_FOR_LIFECYCLE[profile?.lifecycle] === id;
              return (
                <button key={id} type="button" onClick={() => setStrategy(id)}
                        className={cn('text-left p-4 border transition-colors',
                                      active ? 'border-ink bg-paper2/60' : 'hair hover:border-ink/40')}>
                  <div className="min-h-[20px] mb-1.5">
                    {recommended && <Badge tone="accent" className="mono">RECOMMANDÉ</Badge>}
                  </div>
                  <div className="display text-[15px] font-semibold tracking-tight flex items-center gap-2">
                    <span className="text-accent">{s.icon}</span>
                    {s.label}
                  </div>
                  <div className="text-[10.5px] mono uppercase tracking-[0.06em] text-mute mt-1">
                    Stade · {lc?.name || '—'}
                  </div>
                  <div className="text-[11.5px] text-mute mt-2 leading-snug">{s.pitch}</div>
                </button>
              );
            })}
          </div>

          <Card padded={false}>
            <div className="px-5 py-4 border-b hair">
              <div className="display text-[15px] font-semibold tracking-tight">
                Allocation paid media · {strat.label} × {AUDIENCE_TYPES.find(a => a.id === audienceType)?.label || 'B2B2C'}
              </div>
              <div className="text-[11.5px] text-mute mt-0.5">
                Budget paid media mensuel : <span className="num text-ink font-semibold">{fmtCHF(cost.paidMediaMonthly)}</span>
                <span className="mx-1.5 text-line">·</span>
                <span className="mono text-[10px] uppercase tracking-[0.06em]">{Math.round(cost.paidShare * 100)}% du S&amp;M</span>
              </div>
            </div>
            <div className="divide-y hair">
              {CHANNELS
                .slice().sort((a, b) => (allocation[b.id] || 0) - (allocation[a.id] || 0))
                .map(c => {
                  const v = allocation[c.id] || 0;
                  const pct = cost.paidMediaMonthly > 0 ? v / cost.paidMediaMonthly : 0;
                  return (
                    <div key={c.id} className="px-5 py-3 grid grid-cols-[12px_1fr_200px_120px] items-center gap-4">
                      <span className="w-2.5 h-2.5" style={{ background: c.hue }} />
                      <div className="text-[13px] tracking-tight">{c.name}</div>
                      <div>
                        <div className="h-1.5 bg-line2 relative overflow-hidden">
                          <div className="h-full" style={{ width: `${pct * 100}%`, background: c.hue,
                                                            transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <div className="mono text-[10px] text-mute mt-1 uppercase tracking-[0.06em]">{(pct * 100).toFixed(0)}%</div>
                      </div>
                      <div className="text-right num font-semibold text-[13px]">{fmtCHF(v)}</div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Preview / verdict */}
        <PreviewCard title="Synthèse" lead="De l'ambition au plan d'investissement">
          {/* 0. Contexte — carried over from Step I */}
          <div className="pb-4 mb-4 border-b hair">
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Contexte · Étape I</div>
              <button type="button" onClick={back}
                      className="mono text-[10px] uppercase tracking-[0.06em] text-mute hover:text-ink underline underline-offset-2 decoration-line">
                Modifier
              </button>
            </div>
            {/* Weighted KPIs carried from Step I */}
            {(() => {
              const tam = MARKET_ORDER.reduce((a, id) => a + (marketMix[id] || 0) * MARKETS[id].addressableCHF, 0);
              const cacMult = MARKET_ORDER.reduce((a, id) => a + (marketMix[id] || 0) * MARKETS[id].cacMultiplier, 0);
              const retMult = MARKET_ORDER.reduce((a, id) => a + (marketMix[id] || 0) * MARKETS[id].retentionAdj, 0);
              return (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">TAM pond.</div>
                    <div className="num text-[13px] font-semibold tracking-tight text-ink mt-0.5">{fmtCHFShort(tam)}</div>
                  </div>
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">CAC pond.</div>
                    <div className="num text-[13px] font-semibold tracking-tight text-ink mt-0.5">×{cacMult.toFixed(2).replace('.', ',')}</div>
                  </div>
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Rétention</div>
                    <div className="num text-[13px] font-semibold tracking-tight text-ink mt-0.5">×{retMult.toFixed(2).replace('.', ',')}</div>
                  </div>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              {MARKET_ORDER.map(id => {
                const pct = marketMix[id] || 0;
                if (pct <= 0.005) return null;
                return (
                  <div key={id} className="grid grid-cols-[1fr_64px_36px] items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11.5px] tracking-tight truncate">
                      <span>{MARKETS[id].flag}</span>
                      <span>{MARKETS[id].name}</span>
                    </div>
                    <div className="h-1 bg-line2 relative overflow-hidden">
                      <div className="h-full bg-mute" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className="mono text-[10px] text-mute num text-right">{Math.round(pct * 100)}%</span>
                  </div>
                );
              })}
            </div>
            {(cacKnown != null || ltvKnown != null) && (
              <div className="flex items-center gap-4 mt-3 text-[10.5px]">
                {cacKnown != null && (
                  <span className="mono uppercase tracking-[0.06em] text-mute">
                    CAC <span className="text-ink font-semibold num normal-case tracking-tight">{fmtCHF(cacKnown)}</span>
                  </span>
                )}
                {ltvKnown != null && (
                  <span className="mono uppercase tracking-[0.06em] text-mute">
                    LTV <span className="text-ink font-semibold num normal-case tracking-tight">{fmtCHF(ltvKnown)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 1. Target — what they asked for */}
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">1 · Ambition fixée</div>
            <div className="display text-[26px] font-semibold tracking-[-0.025em] num leading-none mt-1.5 text-ink">
              {fmtCHFShort(targetTopLine)} <span className="text-mute text-[13px] font-normal">/ an</span>
            </div>
          </div>

          {/* 2. Required investment — derived */}
          <div className="border-t hair mt-4 pt-4">
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">2 · Investissement requis</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="display text-[26px] font-semibold tracking-[-0.025em] num leading-none text-accent">
                {fmtCHFShort(cost.costAnnual)}
              </span>
              <span className="text-mute text-[12px]">/ an</span>
              <span className="mono text-[10px] uppercase tracking-[0.06em] text-mute ml-auto">
                {(cost.totalPct * 100).toFixed(1).replace('.', ',')}% DU TOP-LINE
              </span>
            </div>
            <div className="text-[11.5px] text-mute mt-1.5 num">
              soit <span className="text-ink font-semibold">{fmtCHFShort(cost.costMonthly)}</span> / mois
            </div>
          </div>

          {/* 3. Projection — what that budget yields */}
          {(() => {
            const ratio = targetTopLine > 0 ? sim.totals.totalRev / targetTopLine : 0;
            const onTarget = ratio >= 0.95 && ratio <= 1.15;
            const overshoots = ratio > 1.15;
            const undershoots = ratio < 0.95;
            const verdictLabel = overshoots ? `CIBLE × ${ratio.toFixed(1).replace('.', ',')}`
                              : onTarget ? 'CIBLE TENUE'
                              : `${fmtPct(ratio, 0)} DE LA CIBLE`;
            const verdictTone = overshoots ? 'text-accent'
                              : onTarget ? 'text-ok'
                              : 'text-warn';
            return (
              <div className="border-t hair mt-4 pt-4">
                <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">3 · Projection à ce budget</div>
                <div className="flex items-baseline justify-between gap-2 mt-1.5">
                  <span className="display text-[26px] font-semibold tracking-[-0.025em] num leading-none text-ink">
                    {fmtCHFShort(sim.totals.totalRev)}
                  </span>
                  <span className={cn('mono text-[10.5px] uppercase tracking-[0.06em]', verdictTone)}>
                    {verdictLabel}
                  </span>
                </div>
                {/* Two-segment bar: cible (ink) vs projection (accent), normalized to max */}
                {(() => {
                  const maxVal = Math.max(targetTopLine, sim.totals.totalRev);
                  const targetW = maxVal > 0 ? (targetTopLine / maxVal) * 100 : 0;
                  const projW   = maxVal > 0 ? (sim.totals.totalRev / maxVal) * 100 : 0;
                  return (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute w-[72px] shrink-0">Cible</span>
                        <div className="relative h-1.5 bg-line2 flex-1">
                          <div className="absolute inset-y-0 left-0 bg-ink"
                               style={{ width: `${targetW}%`, transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <span className="mono text-[10px] text-mute num w-[52px] text-right shrink-0">{fmtCHFShort(targetTopLine)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute w-[72px] shrink-0">Projection</span>
                        <div className="relative h-1.5 bg-line2 flex-1">
                          <div className="absolute inset-y-0 left-0 bg-accent"
                               style={{ width: `${projW}%`, transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <span className="mono text-[10px] text-mute num w-[52px] text-right shrink-0">{fmtCHFShort(sim.totals.totalRev)}</span>
                      </div>
                    </div>
                  );
                })()}
                {overshoots && (
                  <div className="text-[11px] text-mute mt-3 leading-snug">
                    Le mix proposé sur-performe la cible. Réduisez l'ambition ou revoyez le budget à la baisse pour viser juste.
                  </div>
                )}
                {undershoots && (
                  <div className="text-[11px] text-mute mt-3 leading-snug">
                    Le mix actuel n'atteint pas la cible. Augmentez l'investissement ou revoyez la stratégie.
                  </div>
                )}
              </div>
            );
          })()}

          <div className="border-t hair mt-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">4 · Crédibilité du modèle</div>
              <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Source · WordStream / Klaviyo / LinkedIn 2024</div>
            </div>
            {(() => {
              const paidAnnual = cost.paidMediaAnnual;
              // True incremental ROAS: subtract baseline (no-paid-spend) revenue
              // from total revenue, divide by paid spend. This captures the
              // accumulated cohort contribution that flows through retained-base
              // revenue from M2 onward (new customers enter loyal segment).
              const blendedRFM = 0.85;     // weighted RFM monthly value multiplier
              const avgRetention = 0.93;   // blended monthly retention
              // Baseline = existing base revenue with no paid acquisition
              const baseline = startingCustomers * blendedRFM * arpuMonthly * 12 * avgRetention;
              const incrementalRev = Math.max(0, sim.totals.totalRev - baseline);
              const modeledRoas = paidAnnual > 0 ? incrementalRev / paidAnnual : 0;
              const target = cost.roasTarget;
              const delta = target > 0 ? (modeledRoas / target - 1) * 100 : 0;
              const within = Math.abs(delta) <= 25;
              const tone = within ? 'text-ok' : Math.abs(delta) <= 50 ? 'text-warn' : 'text-bad';
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">ROAS cible</div>
                    <div className="num text-[14px] font-semibold tracking-tight text-ink mt-0.5">
                      {target.toFixed(1).replace('.', ',')}×
                    </div>
                    <div className="mono text-[9px] uppercase tracking-[0.06em] text-mute mt-0.5">
                      Bench {INDUSTRIES[profile?.industry]?.name?.split(' ')[0] || 'industrie'}
                    </div>
                  </div>
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">ROAS modélisé</div>
                    <div className="num text-[14px] font-semibold tracking-tight text-ink mt-0.5">
                      {modeledRoas.toFixed(1).replace('.', ',')}×
                    </div>
                    <div className="mono text-[9px] uppercase tracking-[0.06em] text-mute mt-0.5">
                      sur {fmtCHFShort(paidAnnual)} paid
                    </div>
                  </div>
                  <div>
                    <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Écart vs cible</div>
                    <div className={cn('num text-[14px] font-semibold tracking-tight mt-0.5', tone)}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(0)}%
                    </div>
                    <div className="mono text-[9px] uppercase tracking-[0.06em] text-mute mt-0.5">
                      {within ? 'Modèle calibré' : Math.abs(delta) <= 50 ? 'À surveiller' : 'Dérive importante'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="border-t hair mt-4 pt-4 text-[11.5px] text-mute leading-relaxed">
            <span className="mono uppercase tracking-[0.06em] text-mute">Stratégie</span>{' '}
            <span className="text-ink font-semibold">{STRATEGIES[strategy].label}</span> ·{' '}
            <span className="mono uppercase tracking-[0.06em] text-mute">Audience</span>{' '}
            <span className="text-ink font-semibold">{AUDIENCE_TYPES.find(a => a.id === audienceType)?.label}</span>
          </div>
        </PreviewCard>
      </div>
    </StepShell>
  );
}

// ── Step 3: Plan ──────────────────────────────────────────────────────
function StepPlan({ sim, monthlyBudget, marketMix, strategy, audienceType, cost,
                     cacKnown, ltvKnown, mmmSpend, profile, panier, back, setMode, go }) {
  const strat = STRATEGIES[strategy];
  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };
  const { openModal: openWaitlist } = useWaitlist();

  // Top 3 channels for the recommendation paragraph
  const topChannels = sim.totals.channelTotals.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  // CAC / LTV — use override if provided, else inferred from industry/sim
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const lc = LIFECYCLES[profile?.lifecycle] || LIFECYCLES.growth;
  const margin = lc.marginOverride != null ? lc.marginOverride : (ind.margin || 0.6);
  const inferredLTV = panier * (ind.ltvMult || 2.5) * margin;
  const ltv = ltvKnown ?? inferredLTV;
  const cac = cacKnown ?? sim.totals.blendedCAC ?? 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  return (
    <StepShell chapter="III" title="Votre plan de marque, en un coup d'œil."
      profile={profile} go={go}
      lead="Cette synthèse compile vos décisions : périmètre, investissement, allocation, trajectoire 12 mois, économies clients et échelle d'adoption. Imprimable en l'état."
      footer={
        <>
          <Button variant="ghost" icon={<IconArrowLeft size={14} />} onClick={back}>Retour</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { setMode('expert'); go('app/simulator'); }}>
              Affiner en Mode expert
            </Button>
            <Button variant="primary" size="lg" icon={<IconDownload size={14} />} onClick={handlePrint}>
              Imprimer le plan
            </Button>
          </div>
        </>
      }>

      {/* HERO */}
      <Card padded={false} className="overflow-hidden mb-3 print:break-inside-avoid">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          <div className="p-8 lg:p-10">
            <div className="mono text-[11px] uppercase tracking-[0.08em] text-mute">Top-line projeté · 12 mois</div>
            <div className="display text-[64px] lg:text-[88px] leading-[0.92] font-bold tracking-[-0.035em] mt-3 num text-accent">
              {fmtCHFShort(sim.totals.totalRev)}
            </div>
            <div className="text-[14px] text-mute mt-4 max-w-[560px] leading-relaxed">
              Dont <span className="text-ink font-semibold num">{fmtCHFShort(sim.totals.totalExistingRev)}</span> de revenus issus
              de la base existante et <span className="text-accent font-semibold num">{fmtCHFShort(sim.totals.totalNewRev)}</span> de
              nouveaux clients. Coût de croissance <span className="text-ink font-semibold num">{(cost.totalPct * 100).toFixed(1).replace('.', ',')}%</span> ·
              ROAS blendé <span className="text-ink font-semibold num">{sim.totals.blendedROAS.toFixed(2).replace('.', ',')}×</span>.
            </div>
          </div>
          <div className="bg-paper2/60 border-t lg:border-t-0 lg:border-l hair p-8 flex flex-col justify-center gap-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <PreviewKPI label="Paid media / an"   value={fmtCHFShort(cost.paidMediaAnnual)} />
              <PreviewKPI label="Nouveaux clients" value={fmtNum(Math.round(sim.totals.totalNewCustomers))} />
              <PreviewKPI label="CAC"               value={fmtCHF(cac)} />
              <PreviewKPI label="LTV"               value={fmtCHF(ltv)} accent />
              <PreviewKPI label="LTV:CAC"           value={cac > 0 ? `${ltvCacRatio.toFixed(1).replace('.', ',')}×` : '—'} />
              <PreviewKPI label="Stratégie"         value={strat.label} />
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Revenue + cost trajectory */}
      <PlanSection title="Trajectoire 12 mois · revenus & coût cumulé"
        lead="La courbe pleine montre le top-line cumulé (existant + nouveau). La courbe pointillée représente le coût cumulé d'acquisition (axe droit).">
        <div className="p-5"><RevenueCostChart months={sim.months} monthlyBudget={cost.paidMediaMonthly} /></div>
      </PlanSection>

      {/* Section: Speed of growth + Churn vs new (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <PlanSection title="Vitesse de croissance · MoM"
          lead="Variation absolue du top-line mois après mois.">
          <div className="p-5"><SpeedOfGrowthChart months={sim.months} /></div>
        </PlanSection>
        <PlanSection title="Churn vs nouveaux clients"
          lead="Acquisition au-dessus de l'axe, attrition en-dessous.">
          <div className="p-5"><ChurnVsNewChart months={sim.months} /></div>
        </PlanSection>
      </div>

      {/* Section: CAC vs LTV trajectory */}
      <PlanSection title="CAC vs LTV · 12 mois"
        lead={cacKnown != null || ltvKnown != null
          ? "Valeurs fournies par vous. La cible : CAC < LTV de façon durable."
          : "Valeurs inférées de l'industrie et de la simulation. Renseignez vos chiffres en Étape I pour un plan plus précis."}>
        <div className="p-5"><CacLtvChart months={sim.months} monthlyBudget={cost.paidMediaMonthly} ltv={ltv} /></div>
      </PlanSection>

      {/* Section: RFM Adoption Ladder */}
      <PlanSection title="Échelle d'adoption · RFM"
        lead="Composition de votre base client au début (M1) et à la fin (M12) de l'horizon. La progression Casual → Loyal → Champions est le moteur de la rétention.">
        <RfmAdoptionLadder months={sim.months} />
      </PlanSection>

      {/* Section: Channel enablers — radar */}
      <PlanSection title="Canaux activateurs"
        lead="Vos canaux groupés par catégorie d'activation : PPC, Lead gen ABM, Influenceurs, Content, Retention.">
        <div className="p-5"><ChannelRadar mmmSpend={mmmSpend} /></div>
      </PlanSection>

      {/* Section: Marchés */}
      <PlanSection title="Périmètre géographique"
        lead="Répartition de l'effort d'acquisition et contribution attendue au revenu nouveau.">
        <div className="divide-y hair">
          {sim.totals.marketTotals.map(m => {
            const mk = MARKETS[m.id];
            const pct = sim.totals.totalNewRev > 0 ? m.revenue / sim.totals.totalNewRev : 0;
            return (
              <div key={m.id} className="px-5 py-4 grid grid-cols-[36px_1fr_200px_120px] gap-4 items-center">
                <div className="text-[18px]">{mk.flag}</div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold tracking-tight">{mk.name}</div>
                  <div className="text-[11.5px] text-mute mt-0.5">{mk.pitch}</div>
                </div>
                <div>
                  <div className="h-1.5 bg-line2 relative overflow-hidden">
                    <div className="h-full bg-accent"
                         style={{ width: `${pct * 100}%`, transition: 'width 280ms cubic-bezier(.4,0,.2,1)' }} />
                  </div>
                  <div className="mono text-[10.5px] text-mute mt-1.5 uppercase tracking-[0.06em]">
                    {(pct * 100).toFixed(0)}% du nouveau revenu · {fmtNum(Math.round(m.customers))} clients
                  </div>
                </div>
                <div className="text-right display text-[16px] font-semibold tracking-tight num">{fmtCHFShort(m.revenue)}</div>
              </div>
            );
          })}
        </div>
      </PlanSection>

      {/* Recommendation */}
      <Card className="bg-[#f7eeff] mt-3 print:break-inside-avoid">
        <div className="flex items-start gap-5">
          <div className="w-11 h-11 inline-flex items-center justify-center bg-accent text-white shrink-0">
            <IconSpark size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Recommandation Pupsic</div>
            <p className="display text-[18px] font-semibold tracking-tight mt-1.5 leading-snug max-w-[720px]">
              Sur la base de votre périmètre <span className="text-accent">{
                marketMix.vaud > 0.5 ? 'hyper-local' :
                marketMix.others > 0.3 ? 'à l\'international' : 'national suisse'
              }</span> et de votre stratégie <span className="text-accent">{strat.label.toLowerCase()}</span>,
              concentrez l'effort sur <span className="underline underline-offset-4 decoration-accent">{topChannels[0]?.name || '—'}</span>,
              {' '}<span className="underline underline-offset-4 decoration-accent">{topChannels[1]?.name || '—'}</span> et
              {' '}<span className="underline underline-offset-4 decoration-accent">{topChannels[2]?.name || '—'}</span>.
              Ces trois canaux représentent environ {fmtPct((topChannels.reduce((a, c) => a + c.revenue, 0)) / (sim.totals.totalNewRev || 1), 0)} du
              revenu nouveau projeté.
              {cac > 0 && ltv > 0 && (
                <> Votre ratio LTV:CAC de <span className="text-accent num">{ltvCacRatio.toFixed(1).replace('.', ',')}×</span>
                {ltvCacRatio >= 3 ? ' est sain — accélérez l\'investissement.'
                 : ltvCacRatio >= 1 ? ' est tendu — optimisez la rétention avant de scale.'
                 : ' est négatif — re-travaillez l\'acquisition avant tout.'}</>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Waitlist CTA — placed after the recommendation */}
      <WaitlistHeroCard openModal={openWaitlist} context="step3_plan" />
    </StepShell>
  );
}

// ── Small layout primitives ───────────────────────────────────────────
function PreviewCard({ title, lead, children }) {
  return (
    <div className="border hair bg-paper2/40 self-start lg:sticky lg:top-[80px] p-6 print:hidden lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto nice-scroll">
      <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">{title}</div>
      <div className="display text-[14px] text-mute mt-0.5 mb-5">{lead}</div>
      {children}
    </div>
  );
}
function PreviewKPI({ label, value, accent }) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">{label}</div>
      <div className={cn('display text-[20px] font-semibold tracking-tight num mt-1', accent && 'text-accent')}>
        {value}
      </div>
    </div>
  );
}
function PlanSection({ title, lead, children }) {
  return (
    <Card padded={false} className="mt-3 print:break-inside-avoid">
      <div className="px-5 py-4 border-b hair">
        <div className="display text-[16px] font-semibold tracking-tight">{title}</div>
        {lead && <div className="text-[12px] text-mute mt-1 max-w-[640px] leading-snug">{lead}</div>}
      </div>
      {children}
    </Card>
  );
}
function PlanMonthlyTable({ months }) {
  return (
    <div className="overflow-x-auto nice-scroll">
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr className="text-mute mono text-[10px] uppercase tracking-[0.06em]">
            <th className="text-left py-2 font-medium">Mois</th>
            <th className="text-right py-2 font-medium">Existant</th>
            <th className="text-right py-2 font-medium">Nouveaux</th>
            <th className="text-right py-2 font-medium">Total</th>
            <th className="text-right py-2 font-medium">Clients nets</th>
          </tr>
        </thead>
        <tbody className="divide-y hair">
          {months.map(m => (
            <tr key={m.idx}>
              <td className="py-2">{m.label}</td>
              <td className="text-right">{fmtCHFShort(m.existingRev)}</td>
              <td className="text-right text-accent">{fmtCHFShort(m.newRev)}</td>
              <td className="text-right font-semibold">{fmtCHFShort(m.totalRev)}</td>
              <td className="text-right">{fmtNum(Math.round(m.newCustomers))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Print stylesheet ──────────────────────────────────────────────────
function BrandPlannerPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 18mm; size: A4; }
        body { background: white !important; }
        .print\\:hidden { display: none !important; }
        .print\\:block { display: block !important; }
        .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        header { display: none !important; }
        footer { display: none !important; }
        .sticky { position: static !important; }
        .nice-scroll { overflow: visible !important; }
      }
    `}</style>
  );
}

// ── Industry × stage reinvestment benchmark band ─────────────────────
// Visual range guide showing the low / recommended / high S&M reinvestment for
// this user's specific industry × lifecycle combo. Tappable presets.
function ReinvestmentBenchmarkBand({ bench, value, profile, onPick }) {
  if (!bench) return null;
  const ind = INDUSTRIES[profile?.industry];
  const lc  = LIFECYCLES[profile?.lifecycle];
  // Scale 0 → 70% on the band
  const max = 0.70;
  const pct = (v) => `${clamp(v / max, 0, 1) * 100}%`;
  const here = value < bench.low ? 'below'
            : value > bench.high ? 'above'
            : 'within';

  const verdict = here === 'within' ? { label: 'DANS LA NORME', tone: 'ok' }
                  : here === 'below' ? { label: 'EN-DESSOUS DU BENCHMARK', tone: 'warn' }
                  : { label: 'AU-DESSUS DU BENCHMARK', tone: 'warn' };

  return (
    <div className="border-t hair pt-4 mt-1">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">
          Benchmark · {ind?.name || 'Industrie'} × {lc?.name || 'Stade'}
        </div>
        <Badge tone={verdict.tone} className="mono">{verdict.label}</Badge>
      </div>

      {/* Band visualization */}
      <div className="relative h-7">
        {/* Full range track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-line2" />
        {/* Benchmark band (low → high) */}
        <div className="absolute top-1/2 -translate-y-1/2 h-1 bg-accentSoft border-y border-accent/40"
             style={{ left: pct(bench.low), width: `calc(${pct(bench.high)} - ${pct(bench.low)})` }} />
        {/* Recommended tick */}
        <div className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-accent"
             style={{ left: pct(bench.rec) }}
             title={`Recommandé · ${(bench.rec * 100).toFixed(0)}%`} />
        {/* User's current position */}
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-ink rounded-full border-2 border-paper"
             style={{ left: `calc(${pct(value)} - 6px)`, transition: 'left 240ms cubic-bezier(.4,0,.2,1)' }} />
      </div>

      {/* Tappable presets */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onPick(bench.low)}
                className={cn('text-left px-3 py-2 border transition-colors',
                              Math.abs(value - bench.low) < 0.003 ? 'border-ink bg-paper2/60' : 'hair hover:border-ink/40')}>
          <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Conservateur</div>
          <div className="display text-[15px] font-semibold tracking-tight num">{(bench.low * 100).toFixed(0)}%</div>
        </button>
        <button type="button" onClick={() => onPick(bench.rec)}
                className={cn('text-left px-3 py-2 border transition-colors',
                              Math.abs(value - bench.rec) < 0.003 ? 'border-accent bg-[#f7eeff]' : 'hair hover:border-ink/40')}>
          <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-accent">Recommandé</div>
          <div className="display text-[15px] font-semibold tracking-tight num text-accent">{(bench.rec * 100).toFixed(0)}%</div>
        </button>
        <button type="button" onClick={() => onPick(bench.high)}
                className={cn('text-left px-3 py-2 border transition-colors',
                              Math.abs(value - bench.high) < 0.003 ? 'border-ink bg-paper2/60' : 'hair hover:border-ink/40')}>
          <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Agressif (scale)</div>
          <div className="display text-[15px] font-semibold tracking-tight num">{(bench.high * 100).toFixed(0)}%</div>
        </button>
      </div>

      <div className="text-[11px] text-mute mt-3 leading-snug">
        Sources : Bessemer State-of-the-Cloud · OpenView 2024 · McKinsey PME RevOps.
        Le benchmark s'ajuste à votre industrie et votre stade de maturité.
      </div>
    </div>
  );
}

// ── Cost-of-growth breakdown — shows each dimension's contribution to the multiple ──
function CostBreakdown({ cost, profile, audienceType, strategy, marketMix }) {
  const ind = INDUSTRIES[profile?.industry];
  const lc  = LIFECYCLES[profile?.lifecycle];
  const aud = AUDIENCE_TYPES.find(a => a.id === audienceType);
  const str = STRATEGIES[strategy];

  const rows = [
    { label: 'Base',          sub: `${ind?.name || '—'} × ${lc?.name || '—'}`,
      mult: cost.basePct, isBase: true, pct: cost.basePct },
    { label: 'Audience',      sub: aud?.label || '—',
      mult: cost.audienceMult },
    { label: 'Stratégie',     sub: str?.label || '—',
      mult: cost.strategyMult },
    { label: 'International', sub: `${Math.round(cost.intlShare * 100)}% du mix`,
      mult: cost.internationalMult },
  ];

  return (
    <div className="border-t hair pt-4">
      <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute mb-3">Ce qui compose le multiple</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-medium tracking-tight text-ink">{r.label}</div>
              <div className="text-[10.5px] text-mute mt-0.5 truncate">{r.sub}</div>
            </div>
            <div className="mono text-[11px] uppercase tracking-[0.06em] text-mute num">
              {r.isBase
                ? `${(r.pct * 100).toFixed(1).replace('.', ',')}%`
                : `× ${r.mult.toFixed(2).replace('.', ',')}`}
            </div>
            <div className={cn('w-14 h-1.5 bg-line2 relative overflow-hidden',
              !r.isBase && Math.abs(r.mult - 1) < 0.02 && 'opacity-30')}>
              <div className={cn('h-full',
                r.isBase ? 'bg-accent'
                  : r.mult > 1.01 ? 'bg-warn'
                  : r.mult < 0.99 ? 'bg-ok'
                  : 'bg-mute')}
                   style={{ width: r.isBase ? '100%' : `${Math.min(clamp(Math.abs(r.mult - 1) / 0.30, 0, 1), 1) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 pt-3 border-t hair">
          <div className="text-[12.5px] font-semibold tracking-tight text-ink">Total</div>
          <div className="mono text-[12px] uppercase tracking-[0.06em] num font-bold text-accent">
            {(cost.totalPct * 100).toFixed(1).replace('.', ',')}%
          </div>
          <div className="w-14 h-1.5 bg-line2 relative overflow-hidden">
            <div className="h-full bg-accent" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
      <div className="text-[10.5px] text-mute mt-3 leading-snug">
        Modifiez Audience ou Stratégie ci-dessus pour voir le multiple s'ajuster.
        La part internationale du mix (étape I) influence aussi le multiple.
      </div>
    </div>
  );
}

Object.assign(window, { BrandPlannerScreen });
