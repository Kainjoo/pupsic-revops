// Cockpit Financier — adapted from the Allegory Capital model for RevOps.
// Prefills inputs from the onboarding profile (CA, salesTeam, current RevOps).
// Currency follows the user's country (CH → CHF, EU → EUR, UK → GBP, US → USD).
// Outputs:
//   - Financial KPIs (EBITDA, Cash burn, Runway, Marge variable, CA marketing, ROAS)
//   - 12-month stress test (trésorerie + EBITDA bars)
//   - "Avec optimisation RevOps" section showing the lift
//   - Comparison chart with/without RevOps

function CockpitScreen({ user, plan, profile, scenarios, mmmSpend, go }) {
  // Currency from country
  const country = COUNTRIES.find(c => c.id === profile?.country) || COUNTRIES[0];
  const currency = country.currency || 'CHF';
  const fM  = (n, opts) => fmtMoney(n, currency, opts);
  const fMs = (n) => fmtMoneyShort(n, currency);

  // ── Inputs ────────────────────────────────────────────────────────────
  // Prefilled from profile + sensible defaults. Editable inline.
  const caAnnuel = profile?.caAnnuel || 1200000;
  const monthlyRevenue0 = caAnnuel / 12;
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;

  // Sensible default: 5% of monthly revenue (industry-agnostic floor)
  // BUDGET CANONIQUE: si mmmSpend existe, c'est la source de vérité du paid media
  // (synchronisé entre Dashboard / Simulator / Brand Planner / Cockpit).
  const mmmTotal = Object.values(mmmSpend || {}).reduce((a, b) => a + (b || 0), 0);
  const defaultTresorerie  = Math.round(monthlyRevenue0 * 6);          // ~6 mois CA
  const defaultMarketing   = mmmTotal > 0 ? mmmTotal
                           : (profile?.currentRevops || Math.round(monthlyRevenue0 * 0.10));
  const defaultMargeVar    = ind.margin || 0.65;                       // gross margin
  const defaultMassesalary = Math.round((profile?.salesTeam || 4) * 8500); // ~8.5k CHF / commercial
  const defaultFrais       = Math.round(monthlyRevenue0 * 0.25);       // 25% du CA en frais généraux
  const defaultPctMkt      = 0.20;                                     // 20% du CA généré par marketing
  const defaultTaux        = 0.04;                                     // 4% / mois ≈ 60% YoY

  const [tresorerie,    setTresorerie]    = useState(defaultTresorerie);
  const [pctMarketing,  setPctMarketing]  = useState(defaultPctMkt);
  const [marketingDep,  setMarketingDep]  = useState(defaultMarketing);
  const [tauxCroissance,setTauxCroissance]= useState(defaultTaux);
  const [margeVariable, setMargeVariable] = useState(defaultMargeVar);
  const [masseSalariale,setMasseSalariale]= useState(defaultMassesalary);
  const [fraisGeneraux, setFraisGeneraux] = useState(defaultFrais);

  // ── Derived KPIs (current state, month 0) ────────────────────────────
  const caMensuel    = monthlyRevenue0;
  const margeMonth   = caMensuel * margeVariable;
  const ebitdaMonth  = margeMonth - masseSalariale - fraisGeneraux - marketingDep;
  const cashBurn     = ebitdaMonth < 0 ? -ebitdaMonth : 0;
  const runwayMonths = cashBurn > 0 ? tresorerie / cashBurn : Infinity;
  const caMarketing  = caMensuel * pctMarketing;
  const roas         = marketingDep > 0 ? caMarketing / marketingDep : 0;

  // ── 12-month projection — baseline (no extra RevOps lift) ────────────
  const baseline = useMemo(() =>
    projectTrajectory({
      months: 12,
      startRevenue: caMensuel,
      startTresorerie: tresorerie,
      growthRate: tauxCroissance,
      pctMarketing, marketingDep, margeVariable, masseSalariale, fraisGeneraux,
      revOpsLift: 0,
    }),
    [tresorerie, caMensuel, tauxCroissance, pctMarketing, marketingDep, margeVariable, masseSalariale, fraisGeneraux]
  );

  // ── With RevOps optimisation lift (no commercial offer — generic +25% ROAS + retention) ──
  // RevOps efficacy converts to:
  //   - +25% ROAS (same spend → more CA marketing)
  //   - +0.6pt monthly growth rate (compounded retention + funnel)
  const lifted = useMemo(() =>
    projectTrajectory({
      months: 12,
      startRevenue: caMensuel,
      startTresorerie: tresorerie,
      growthRate: tauxCroissance + 0.006,
      pctMarketing: Math.min(1, pctMarketing * 1.25),
      marketingDep, margeVariable, masseSalariale, fraisGeneraux,
      revOpsLift: 0.25,
    }),
    [tresorerie, caMensuel, tauxCroissance, pctMarketing, marketingDep, margeVariable, masseSalariale, fraisGeneraux]
  );

  // Final-month diffs for the lift callouts
  const endBase    = baseline.months[11];
  const endLifted  = lifted.months[11];
  const liftRevenueAnnual = lifted.totalRevenue - baseline.totalRevenue;
  const liftRunwayMonths  = (lifted.runwayEnd === Infinity ? null : lifted.runwayEnd)
                         - (baseline.runwayEnd === Infinity ? null : baseline.runwayEnd);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/cockpit" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        <ExpertHeader
          eyebrow={`Financials · P&L 12 mois · ${currency}`}
          title="Combien de temps votre cash vous tient — et ce que RevOps change."
          lead="Modèle financier : EBITDA, cash burn, runway, trésorerie. 7 entrées préfillées depuis votre profil + benchmarks industrie. Éditez chaque champ pour refléter votre réalité — chaque valeur est taggée par sa source."
          crossLinks={[
            { label: 'Dashboard · snapshot du mois',   onClick: () => go('app/dashboard') },
            { label: 'Simulator · projection 12 mois', onClick: () => go('app/simulator') },
            { label: 'Modifier le profil',             onClick: () => go('app/onboarding') },
          ]}
        />

        {/* ── Methodology callout ──────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair flex items-start gap-4">
          <div className="w-8 h-8 inline-flex items-center justify-center border hair bg-paper shrink-0 mt-0.5">
            <IconSpark size={13} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="t-caption text-accent">Méthodologie · hypothèses préfillées</div>
            <p className="t-body text-ink mt-1.5 max-w-[820px]">
              Le modèle déduit les chiffres financiers de votre profil : CA onboarding, marge médiane {ind.name},
              budget marketing depuis l'allocation MMM ({fmtCHFShort(mmmTotal)} / mois).
              Trésorerie, masse salariale, frais généraux et croissance sont des défauts — éditez-les pour fiabiliser.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 t-caption text-mute normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
              <span className="flex items-center gap-1.5"><SrcBadge tone="ok">Profil</SrcBadge> données onboarding</span>
              <span className="flex items-center gap-1.5"><SrcBadge tone="ok">MMM</SrcBadge> allocation média</span>
              <span className="flex items-center gap-1.5"><SrcBadge tone="neutral">Industrie</SrcBadge> médiane {ind.name}</span>
              <span className="flex items-center gap-1.5"><SrcBadge tone="warn">Défaut</SrcBadge> à éditer</span>
            </div>
          </div>
        </div>

        {/* ── Outcome strip ────────────────────────────────────────────── */}
        <OutcomeStrip
          tone={ebitdaMonth >= 0 ? 'accent' : 'accent'}
          primary={{
            label: 'EBITDA mensuel · état actuel',
            value: ebitdaMonth,
            format: (v) => fM(v, { sign: true }),
            sub: ebitdaMonth >= 0
              ? `Vous générez du cash. Runway opérationnel théorique ∞ tant que l'EBITDA reste positif.`
              : `Vous brûlez ${fM(cashBurn)} / mois. Runway estimé · ${runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1).replace('.', ',') + ' mois'}.`,
          }}
          kpis={[
            { label: 'Trésorerie',          value: tresorerie,  format: fMs,                                          sub: `≈ ${(tresorerie / caMensuel).toFixed(1).replace('.', ',')} mois de CA` },
            { label: 'CA marketing / mois', value: caMarketing, format: fMs,                                          sub: `${fmtPct(pctMarketing, 0)} du CA total` },
            { label: 'ROAS',                value: roas,        format: (v) => `${v.toFixed(2).replace('.', ',')}×`, sub: `Sur ${fMs(marketingDep)} de paid / mois` },
            { label: 'Burn / mois',         value: cashBurn,    format: fMs,                                          sub: cashBurn > 0 ? 'Cash négatif' : 'Aucun burn' },
          ]}
        />

        {/* ── Inputs + KPIs ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-12 pb-12 mb-12 border-b hair">

          {/* Inputs column */}
          <div className="lg:sticky lg:top-[80px] self-start">
            <div className="mb-5">
              <div className="t-bodyhi text-ink">Inputs financiers</div>
              <div className="t-caption text-mute mt-1">Préfillé depuis votre profil · éditable inline</div>
            </div>

            <div>
              <KVRow label="Trésorerie actuelle" source={{label: 'Défaut', tone: 'warn'}}>
                <CockpitInput value={tresorerie} onChange={setTresorerie} fmt={(v) => fMs(v)} />
              </KVRow>
              <KVRow label="Chiffre d'affaires (12 derniers mois)" lead source={{label: 'Profil', tone: 'ok'}}>
                <div className="t-num text-accent num">{fM(caAnnuel)}</div>
              </KVRow>
            </div>

            <div className="t-caption text-mute mt-6 mb-3">Leviers de croissance</div>
            <div>
              <KVRow label="% du CA généré par le marketing" source={{label: 'Défaut', tone: 'warn'}}>
                <CockpitInput value={pctMarketing} onChange={setPctMarketing}
                  fmt={(v) => `${(v * 100).toFixed(0)}%`} step={0.01} max={1} />
              </KVRow>
              <KVRow label="Dépenses marketing mensuelles" source={{label: mmmTotal > 0 ? 'MMM' : 'Défaut', tone: mmmTotal > 0 ? 'ok' : 'warn'}}>
                <CockpitInput value={marketingDep} onChange={setMarketingDep} fmt={(v) => fMs(v)} />
              </KVRow>
              <KVRow label="Taux de croissance mensuel" source={{label: 'Défaut', tone: 'warn'}}>
                <CockpitInput value={tauxCroissance} onChange={setTauxCroissance}
                  fmt={(v) => `${(v * 100).toFixed(1).replace('.', ',')}%`} step={0.005} max={0.5} />
              </KVRow>
              <KVRow label="% de marge sur coûts variables" source={{label: 'Industrie', tone: 'neutral'}}>
                <CockpitInput value={margeVariable} onChange={setMargeVariable}
                  fmt={(v) => `${(v * 100).toFixed(0)}%`} step={0.01} max={1} />
              </KVRow>
              <KVRow label="Masse salariale mensuelle" source={{label: 'Défaut', tone: 'warn'}}>
                <CockpitInput value={masseSalariale} onChange={setMasseSalariale} fmt={(v) => fMs(v)} />
              </KVRow>
              <KVRow label="Frais généraux mensuels" source={{label: 'Défaut', tone: 'warn'}}>
                <CockpitInput value={fraisGeneraux} onChange={setFraisGeneraux} fmt={(v) => fMs(v)} />
              </KVRow>
            </div>

            <div className="mt-8 pt-6 border-t hair space-y-5">
              <div>
                <div className="t-caption text-mute mb-1">Runway</div>
                <div className="t-body text-ink">Temps dont dispose une entreprise pour rester solvable, à investissement constant.</div>
              </div>
              <div>
                <div className="t-caption text-mute mb-1">Burn</div>
                <div className="t-body text-ink">Rythme mensuel de consommation de trésorerie.</div>
              </div>
              <div>
                <div className="t-caption text-mute mb-1">ROAS</div>
                <div className="t-body text-ink">CHF de CA généré par CHF de budget marketing dépensé.</div>
              </div>
            </div>
          </div>

          {/* KPIs + charts column */}
          <div className="min-w-0 space-y-12">

            {/* KPIs */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">KPI Financiers · 12 derniers mois</div>
                  <div className="t-caption text-mute mt-1">État actuel · mois 0</div>
                </div>
              </div>
              <div className="divide-y hair">
                <KpiFlat label="EBITDA mensuel"
                        value={fM(ebitdaMonth, { sign: true })}
                        tone={ebitdaMonth >= 0 ? 'ok' : 'bad'} />
                <KpiFlat label="Cash burn mensuel moyen"
                        value={cashBurn > 0 ? fM(cashBurn) : <span className="text-ok">Rentable</span>} />
                <KpiFlat label="Runway"
                        value={runwayMonths === Infinity
                          ? <span className="text-ok">Rentable</span>
                          : `${runwayMonths.toFixed(1).replace('.', ',')} mois`} />
                <KpiFlat label="Marge mensuelle sur coût variable" value={fM(margeMonth)} />
                <KpiFlat label="CA mensuel généré par le marketing" value={fM(caMarketing)} />
                <KpiFlat label="ROAS"
                        value={`${roas.toFixed(2).replace('.', ',')}×`}
                        sub="CA marketing / dépenses marketing" />
              </div>
            </div>

            {/* Stress test */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Stress test · 12 prochains mois</div>
                  <div className="t-caption text-mute mt-1">Trésorerie & EBITDA projetés au taux actuel</div>
                </div>
              </div>
              <BarChart12 months={baseline.months} currency={currency}
                          labelA="Trésorerie" colorA="#8D0AF5"
                          labelB="EBITDA" colorB="#131022"
                          keyA="tresorerie" keyB="ebitda" />
            </div>
          </div>
        </div>

        {/* ── RevOps lift ──────────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Aller plus loin avec une optimisation RevOps</div>
              <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
                Audit funnel + SLA réponse + scoring lead + ré-allocation canaux. Effet estimé : +25% ROAS, +0,6pt croissance mensuelle.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
            <div>
              <div className="t-caption text-mute">ROAS attendu</div>
              <div className="t-hero text-accent mt-2">+25%</div>
              <div className="t-body text-mute mt-1.5">à dépense constante</div>
            </div>
            <div>
              <div className="t-caption text-mute">Top-line additionnel · 12 mois</div>
              <div className="t-hero text-ink mt-2" style={{ fontSize: 24 }}>{fMs(liftRevenueAnnual)}</div>
              <div className="t-body text-mute mt-1.5">cumulé</div>
            </div>
            <div>
              <div className="t-caption text-mute">CA marketing · mois 12</div>
              <div className="t-hero text-ink mt-2" style={{ fontSize: 24 }}>{fMs(endLifted.caMarketing - endBase.caMarketing)}</div>
              <div className="t-body text-mute mt-1.5">additionnel</div>
            </div>
            <div>
              <div className="t-caption text-mute">Runway allongé</div>
              <div className="t-hero text-ink mt-2" style={{ fontSize: 24 }}>
                {(baseline.runwayEnd === Infinity && lifted.runwayEnd === Infinity)
                  ? <span className="text-ok">Rentable</span>
                  : liftRunwayMonths === null || !Number.isFinite(liftRunwayMonths)
                    ? <span className="text-ok">Rentabilisé</span>
                    : `+${liftRunwayMonths.toFixed(1).replace('.', ',')} mois`}
              </div>
              <div className="t-body text-mute mt-1.5">vs baseline</div>
            </div>
          </div>
        </div>

        {/* ── Comparison charts ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 pb-12 mb-12 border-b hair">
          <div>
            <div className="t-bodyhi text-ink mb-5">Hypothèse de croissance · CA cumulé</div>
            <RevenueLiftChart base={baseline.months} lifted={lifted.months} currency={currency} />
          </div>
          <div>
            <div className="t-bodyhi text-ink mb-5">Trajectoire avec optimisation RevOps</div>
            <BarChart12 months={lifted.months} currency={currency}
                        labelA="Trésorerie" colorA="#8D0AF5"
                        labelB="EBITDA" colorB="#131022"
                        keyA="tresorerie" keyB="ebitda" />
          </div>
        </div>

        {/* ── Trésorerie comparison ────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="t-bodyhi text-ink mb-5">Croissance avec et sans optimisation RevOps · trésorerie</div>
          <TresoComparisonChart base={baseline.months} lifted={lifted.months} currency={currency} />
        </div>

      </div>
    </PageShell>
  );
}

// ─── Trajectory projector ────────────────────────────────────────────
// Monthly forward simulation: revenue grows compounded, EBITDA accumulates to trésorerie.
function projectTrajectory({ months, startRevenue, startTresorerie, growthRate,
                              pctMarketing, marketingDep, margeVariable,
                              masseSalariale, fraisGeneraux, revOpsLift = 0 }) {
  const monthsArr = [];
  let revenue = startRevenue;
  let treso   = startTresorerie;
  let totalRev = 0;

  for (let i = 0; i < months; i++) {
    revenue = revenue * (1 + growthRate);
    const margeMonth  = revenue * margeVariable;
    // RevOps lift adds efficacy on the same marketing spend
    const ebitdaMonth = margeMonth - masseSalariale - fraisGeneraux - marketingDep + (marketingDep * revOpsLift * 0.6);
    treso += ebitdaMonth;
    const caMarketing = revenue * pctMarketing;
    totalRev += revenue;
    monthsArr.push({
      idx: i, label: `M${i + 1}`,
      revenue, margeMonth, ebitda: ebitdaMonth, tresorerie: treso, caMarketing,
    });
  }

  const lastEbitda = monthsArr[monthsArr.length - 1].ebitda;
  const runwayEnd = lastEbitda >= 0 ? Infinity : treso / -lastEbitda;

  return { months: monthsArr, totalRevenue: totalRev, runwayEnd };
}

// ─── KV row (inputs panel) — flat with hairline divider ──────────────────
function KVRow({ label, children, lead, source }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-baseline py-3 border-b hair">
      <div className={cn('t-body flex items-center gap-1.5 flex-wrap',
        lead ? 'text-ink' : 'text-mute')}>
        <span>{label}</span>
        {source && <SrcBadge tone={source.tone}>{source.label}</SrcBadge>}
      </div>
      <div className="text-right">{children}</div>
    </div>
  );
}

// Source badge — tiny provenance tag
function SrcBadge({ children, tone = 'neutral' }) {
  const cls = tone === 'ok'   ? 'text-accent'
            : tone === 'warn' ? 'text-warn'
            : 'text-mute';
  return (
    <span className={cn('t-caption tabular-nums', cls)}
          style={{ fontSize: 9.5 }}>
      · {children}
    </span>
  );
}

function CockpitInput({ value, onChange, fmt, step, min = 0, max = 1e9 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  if (editing) {
    return (
      <input type="number"
             autoFocus
             value={draft}
             onChange={(e) => setDraft(e.target.value)}
             onBlur={() => {
               const v = Number(draft);
               if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
               setEditing(false);
             }}
             onKeyDown={(e) => {
               if (e.key === 'Enter') e.currentTarget.blur();
               if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
             }}
             step={step}
             className="w-[110px] bg-paper text-ink px-2 py-1 text-[13px] num text-right outline-none" />
    );
  }
  return (
    <button type="button"
            onClick={() => setEditing(true)}
            className="t-num text-accent num hover:underline underline-offset-4 decoration-accent/40">
      {fmt(value)}
    </button>
  );
}

// ─── KPI row (flat, hairline) ─────────────────────────────────────────
function KpiFlat({ label, value, tone, sub }) {
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="py-3 grid grid-cols-[1fr_auto] gap-4 items-baseline">
      <div>
        <div className="t-body text-ink">{label}</div>
        {sub && <div className="t-caption text-mute mt-1">{sub}</div>}
      </div>
      <div className={cn('t-num num tabular-nums', toneClass)}>
        {value}
      </div>
    </div>
  );
}

// ─── Bar chart: 12 months with two series (e.g. trésorerie + EBITDA) ─
function BarChart12({ months, currency, labelA, labelB, colorA, colorB, keyA, keyB }) {
  const W = 760, H = 220, padL = 56, padR = 12, padT = 22, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = months.length;
  const valsA = months.map(m => m[keyA] || 0);
  const valsB = months.map(m => m[keyB] || 0);
  const maxV  = Math.max(...valsA, ...valsB) * 1.10 || 1;
  const minV  = Math.min(0, ...valsB) * 1.10;
  const range = maxV - minV;
  const yAt   = (v) => padT + innerH - ((v - minV) / range) * innerH;
  const groupW = innerW / N;
  const barW = groupW * 0.32;

  return (
    <MeasuredWidth className="h-[240px]">
      {(width) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 220 }} preserveAspectRatio="none">
            {/* Y grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const v = minV + range * t;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
                        stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={t === 0 ? '' : '2 3'} />
                  <text x={padL - 6} y={yAt(v) + 3} textAnchor="end"
                        fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                    {fmtMoneyShort(v, currency)}
                  </text>
                </g>
              );
            })}
            {/* Zero line */}
            {minV < 0 && (
              <line x1={padL} x2={W - padR} y1={yAt(0)} y2={yAt(0)}
                    stroke="rgba(19,16,34,0.40)" strokeWidth="0.8" />
            )}
            {/* Bars */}
            {months.map((m, i) => {
              const cx = padL + (i + 0.5) * groupW;
              const vA = m[keyA] || 0;
              const vB = m[keyB] || 0;
              return (
                <g key={i}>
                  <rect x={cx - barW - 1} y={Math.min(yAt(vA), yAt(0))}
                        width={barW} height={Math.abs(yAt(vA) - yAt(0))}
                        fill={colorA} />
                  <rect x={cx + 1} y={Math.min(yAt(vB), yAt(0))}
                        width={barW} height={Math.abs(yAt(vB) - yAt(0))}
                        fill={colorB} />
                  {(i % 2 === 0 || i === N - 1) && (
                    <text x={cx} y={H - padB + 14} textAnchor="middle"
                          fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                      {m.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3" style={{ background: colorA }} />
              <span className="text-mute tracking-tight">{labelA}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3" style={{ background: colorB }} />
              <span className="text-mute tracking-tight">{labelB}</span>
            </span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

// ─── Stacked-line lift chart: revenue with vs without RevOps ────────
function RevenueLiftChart({ base, lifted, currency }) {
  const W = 760, H = 220, padL = 56, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = base.length;
  const yMax = Math.max(...lifted.map(m => m.revenue)) * 1.05 || 1;
  const yMin = 0;
  const xAt = (i) => padL + (i / (N - 1)) * innerW;
  const yAt = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const liftedPath = lifted.map((m, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(m.revenue).toFixed(1)}`).join(' ');
  const basePath   = base.map((m, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(m.revenue).toFixed(1)}`).join(' ');
  const liftArea = `${liftedPath} ${base.slice().reverse().map((m, i) => {
    const realI = N - 1 - i;
    return `L ${xAt(realI).toFixed(1)} ${yAt(m.revenue).toFixed(1)}`;
  }).join(' ')} Z`;

  return (
    <MeasuredWidth className="h-[240px]">
      {(width) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 220 }} preserveAspectRatio="none">
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const v = yMax * t;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
                        stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={i === 0 ? '' : '2 3'} />
                  <text x={padL - 6} y={yAt(v) + 3} textAnchor="end"
                        fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                    {fmtMoneyShort(v, currency)}
                  </text>
                </g>
              );
            })}
            <path d={liftArea} fill="#8D0AF5" fillOpacity="0.18" />
            <path d={liftedPath} stroke="#8D0AF5" strokeWidth="1.8" fill="none" />
            <path d={basePath}   stroke="#131022" strokeWidth="1.4" fill="none" strokeDasharray="3 2" />
            {base.map((m, i) => (
              (i % 2 === 0 || i === N - 1) && (
                <text key={i} x={xAt(i)} y={H - padB + 14} textAnchor="middle"
                      fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                  {m.label}
                </text>
              )
            ))}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-[2px] bg-accent" />
              <span className="text-accent tracking-tight">Avec RevOps</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-px border-t border-dashed border-ink" />
              <span className="text-mute tracking-tight">Sans optimisation</span>
            </span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

// ─── Trésorerie comparison: bars side-by-side ──────────────────────
function TresoComparisonChart({ base, lifted, currency }) {
  const W = 760, H = 220, padL = 56, padR = 12, padT = 22, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = base.length;
  const allVals = [...base.map(m => m.tresorerie), ...lifted.map(m => m.tresorerie)];
  const maxV = Math.max(...allVals, 0) * 1.10 || 1;
  const minV = Math.min(...allVals, 0) * 1.10;
  const range = maxV - minV;
  const yAt = (v) => padT + innerH - ((v - minV) / range) * innerH;
  const groupW = innerW / N;
  const barW = groupW * 0.32;

  return (
    <MeasuredWidth className="h-[240px]">
      {(width) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 220 }} preserveAspectRatio="none">
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const v = minV + range * t;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
                        stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={t === 0 ? '' : '2 3'} />
                  <text x={padL - 6} y={yAt(v) + 3} textAnchor="end"
                        fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                    {fmtMoneyShort(v, currency)}
                  </text>
                </g>
              );
            })}
            {minV < 0 && (
              <line x1={padL} x2={W - padR} y1={yAt(0)} y2={yAt(0)}
                    stroke="rgba(19,16,34,0.40)" strokeWidth="0.8" />
            )}
            {base.map((m, i) => {
              const cx = padL + (i + 0.5) * groupW;
              const vBase = m.tresorerie;
              const vLift = lifted[i].tresorerie;
              return (
                <g key={i}>
                  <rect x={cx - barW - 1} y={Math.min(yAt(vBase), yAt(0))}
                        width={barW} height={Math.abs(yAt(vBase) - yAt(0))}
                        fill="#6e6a85" />
                  <rect x={cx + 1} y={Math.min(yAt(vLift), yAt(0))}
                        width={barW} height={Math.abs(yAt(vLift) - yAt(0))}
                        fill="#8D0AF5" />
                  {(i % 2 === 0 || i === N - 1) && (
                    <text x={cx} y={H - padB + 14} textAnchor="middle"
                          fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                      {m.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-accent" />
              <span className="text-accent tracking-tight">Trésorerie avec RevOps</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-mute" />
              <span className="text-mute tracking-tight">Trésorerie sans optimisation</span>
            </span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

Object.assign(window, { CockpitScreen });
