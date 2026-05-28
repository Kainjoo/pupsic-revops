// RevOps Calculator — flat editorial layout (Dashboard pattern)
// Strict t-caption / t-bodyhi / t-num / t-hero / t-body scale. Hairline sections, no Cards.

function InputGroup({ title, children, trailing }) {
  return (
    <div className="border-t hair first:border-t-0 pt-5 mt-5 first:pt-0 first:mt-0">
      <div className="flex items-center justify-between mb-4">
        <div className="t-caption text-mute">{title}</div>
        {trailing}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function CalculatorScreen({ user, plan, profile, scenarios, addScenario, updateScenario, focusScenarioId, go }) {
  const focused = scenarios.find(s => s.id === focusScenarioId);

  const initialInputs = useMemo(() => {
    if (focused) return focused.inputs;
    const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
    const country = COUNTRIES.find(c => c.id === profile?.country) || COUNTRIES[0];
    const lc = LIFECYCLES[profile?.lifecycle] || LIFECYCLES.growth;
    const caAnnuel = profile?.caAnnuel || DEFAULT_SCENARIO_INPUTS.caAnnuel;
    const monthlyCA = caAnnuel / 12;
    const responseAdj = country.responseAdj || 1;
    const leads = Math.max(10, Math.round(monthlyCA / (ind.conv * ind.closing * ind.panier)));
    return {
      industry: ind.id,
      country: country.id,
      lifecycle: lc.id,
      caAnnuel,
      leadsMois: leads,
      conversion: ind.conv,
      closing: ind.closing,
      panier: Math.round(ind.panier * (country.panierAdj || 1)),
      responseTimeMin: Math.round(ind.response * responseAdj),
      equipe: profile?.salesTeam || 4,
      revopsBudget: profile?.currentRevops || 0,
    };
  }, [focused, profile]);

  const [inputs, setInputs] = useState(initialInputs);
  const [name, setName] = useState(focused?.name || (INDUSTRIES[initialInputs.industry]?.name + ' · ' + new Date().toLocaleDateString('fr-CH')));
  const [savedId, setSavedId] = useState(focused?.id || null);
  const { toast } = useToast();

  useEffect(() => {
    if (focused) { setInputs(focused.inputs); setName(focused.name); setSavedId(focused.id); }
  }, [focusScenarioId]);

  const setI = (k, v) => setInputs(prev => ({ ...prev, [k]: v }));

  const result = useMemo(() => computeScenario(inputs), [inputs]);
  const ind = INDUSTRIES[inputs.industry] || INDUSTRIES.saas_b2b;
  const country = COUNTRIES.find(c => c.id === inputs.country) || COUNTRIES[0];
  const lc = LIFECYCLES[inputs.lifecycle] || LIFECYCLES.growth;
  const priorityObj = PRIORITIES.find(p => p.id === profile?.priority);
  const score = useMemo(() => computeRevopsScore(profile?.maturity), [profile?.maturity]);
  const tierMeta = MATURITY_TIERS[score.tier];

  const cap = PLANS[plan].caps.scenarios;
  const atCap = scenarios.length >= cap && !savedId;

  const save = () => {
    if (savedId) {
      updateScenario(savedId, { name, inputs });
      toast('Scénario mis à jour');
    } else {
      if (atCap) {
        toast(`Plan ${PLANS[plan].name} : ${cap === Infinity ? '∞' : cap} scénario(s) max`, { tone: 'accent' });
        return;
      }
      const s = addScenario({ name, inputs });
      setSavedId(s.id);
      toast('Scénario enregistré');
    }
  };

  const continuumPct = result.optimised > 0 ? result.realised / result.optimised : 0;
  const sortedBuckets = result.buckets.slice().sort((a, b) => b.value - a.value);
  const top = sortedBuckets[0];

  const roiPct = result.roi;
  const roiBadge = roiPct >= 0.35 ? 'Fuite critique'
                 : roiPct >= 0.15 ? 'Marge d\'optimisation'
                 : 'Pipeline sain';

  const netMonthly = result.netMonthly;
  const recovered = result.recovered;
  const budget = result.budget;
  const payback = result.paybackMonths;

  return (
    <PageShell user={user} plan={plan} currentScreen="app/calculator" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        {/* ── Save bar (compact) ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <Input value={name} onChange={e => setName(e.target.value)} className="w-[260px]" prefix="#" />
          <Button variant="primary" size="sm" icon={<IconSave size={13}/>} onClick={save} disabled={atCap}>
            {savedId ? 'Mettre à jour' : 'Sauvegarder'}
          </Button>
        </div>

        <ExpertHeader
          eyebrow={`Leak Calculator · diagnostic du funnel · ${ind.name} · ${country.flag} ${country.name} · ${lc.icon} ${lc.name}`}
          title="Où vous laissez de l'argent — et comment le récupérer."
          lead="Quatre buckets de fuite + santé par étape du funnel + attribution multi-touch. Sources : Forrester · SaaS Capital · HubSpot State of Marketing 2024."
          crossLinks={[
            { label: 'RFM · base existante',          onClick: () => go('app/rfm') },
            { label: 'MMM · allouer le budget paid',  onClick: () => go('app/mmm') },
            { label: 'Simulator · projeter 12 mois',  onClick: () => go('app/simulator') },
            { label: 'Modifier le profil',            onClick: () => go('app/onboarding') },
          ]}
        />

        <OutcomeStrip
          tone={result.totalLeak > 0 && budget === 0 ? 'accent' : 'accent'}
          primary={{
            label: budget > 0 ? 'Net mensuel avec RevOps' : 'Fuite mensuelle estimée',
            value: budget > 0 ? netMonthly : result.totalLeak,
            format: (v) => fmtCHF(v, { sign: budget > 0 }),
            sub: budget > 0
              ? <>Budget {fmtCHF(budget)} / mois · payback en {payback === Infinity ? '—' : `${payback.toFixed(1).replace('.', ',')} mois`} · {fmtCHF(result.annualNet)} top-line annuel net.</>
              : <>{fmtCHF(result.totalLeak * 12)} récupérables sur 12 mois. Activez un budget RevOps pour modéliser le ROI.</>,
          }}
          kpis={[
            { label: 'Fuite / mois',     value: result.totalLeak,  format: fmtCHF,        sub: roiBadge },
            { label: 'Récupérée',        value: recovered,         format: fmtCHF,        sub: budget > 0 ? `${fmtPct(result.recoveryRatio, 0)} de la fuite` : 'Activer un budget' },
            { label: 'CAC actuel',       value: result.cac,        format: fmtCHF,        sub: `LTV ${fmtCHFShort(result.ltv)} · ×${result.ltvCacRatio === Infinity ? '∞' : result.ltvCacRatio.toFixed(1).replace('.', ',')}` },
            { label: 'Pipeline mensuel', value: result.realised,   format: fmtCHFShort,   sub: `vs ${fmtCHFShort(result.optimised)} optimisé · ${fmtPct(continuumPct, 0)}` },
          ]}
        />

        {/* ── Funnel health ────────────────────────────────────────────── */}
        <FunnelHealth inputs={inputs} ind={ind} result={result} />

        {/* ── Multi-touch attribution ──────────────────────────────────── */}
        <MultiTouchAttribution inputs={inputs} ind={ind} />

        {/* ── Controls + Outputs ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 pb-12 mb-12 border-b hair">

          {/* Controls */}
          <div className="lg:sticky lg:top-[80px] self-start">
            <div className="flex items-baseline justify-between mb-5">
              <div className="t-bodyhi text-ink">Réglages</div>
              <button onClick={() => setInputs(initialInputs)} className="t-caption text-mute hover:text-ink">
                Reset
              </button>
            </div>

            <InputGroup title="★ Votre investissement RevOps">
              <FieldSlider label="Budget RevOps / mois"
                value={inputs.revopsBudget} min={0} max={20000} step={100}
                format={(v) => fmtCHF(v)}
                accent
                benchmark={Math.round((inputs.caAnnuel / 12) * 0.01)}
                benchmarkLabel="1% du CA mensuel"
                hint={`Médian SME suisse : 0,5 – 2% du CA mensuel (≈ ${fmtCHFShort((inputs.caAnnuel / 12) * 0.01)}).`}
                onChange={(v) => setI('revopsBudget', v)} />
            </InputGroup>

            <InputGroup title="01 · Pipeline">
              <FieldSlider label="Chiffre d'affaires annuel"
                value={inputs.caAnnuel} min={100000} max={20000000} step={50000}
                format={(v) => fmtCHF(v)}
                onChange={v => setI('caAnnuel', v)} />
              <FieldSlider label="Leads entrants / mois"
                value={inputs.leadsMois} min={10} max={5000} step={10}
                format={(v) => fmtNum(v)}
                onChange={v => setI('leadsMois', v)} />
              <FieldSlider label="Conversion lead → opportunité"
                value={inputs.conversion} min={0.02} max={0.6} step={0.01}
                format={(v) => fmtPct(v)}
                benchmark={ind.conv}
                benchmarkLabel={`${fmtPct(ind.conv, 0)} médian ${ind.name}`}
                onChange={v => setI('conversion', v)} />
              <FieldSlider label="Closing opportunité → won"
                value={inputs.closing} min={0.05} max={0.7} step={0.01}
                format={(v) => fmtPct(v)}
                benchmark={ind.closing}
                benchmarkLabel={`${fmtPct(ind.closing, 0)} médian ${ind.name}`}
                onChange={v => setI('closing', v)} />
              <FieldSlider label="Panier moyen"
                value={inputs.panier} min={50} max={50000} step={50}
                format={(v) => fmtCHF(v)}
                onChange={v => setI('panier', v)} />
            </InputGroup>

            <InputGroup title="02 · Opération">
              <FieldSlider label="Temps de réponse (min)"
                value={inputs.responseTimeMin} min={1} max={240} step={1}
                format={(v) => `${v} min`}
                benchmark={5} benchmarkLabel="< 5 min · Forrester"
                onChange={v => setI('responseTimeMin', v)} />
              <FieldSlider label="Équipe commerciale"
                value={inputs.equipe} min={1} max={60} step={1}
                format={(v) => `${v} pers.`}
                benchmark={Math.max(1, Math.round(inputs.leadsMois / 150))}
                benchmarkLabel="~150 leads / pers."
                onChange={v => setI('equipe', v)} />
            </InputGroup>
          </div>

          {/* Outputs */}
          <div className="space-y-12 min-w-0">

            {/* RevOps budget impact */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Impact du budget RevOps</div>
                  <div className="t-caption text-mute mt-1">Courbe de récupération</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <BudgetCurve totalLeak={result.totalLeak} sat={result.sat} budget={budget} />
                <div className="space-y-0 divide-y hair">
                  <RowKV label="Budget RevOps / mois" value={fmtCHF(budget)} />
                  <RowKV label="Fuite récupérée"      value={fmtCHF(recovered)} accent />
                  <RowKV label="Net mensuel"          value={fmtCHF(netMonthly, { sign: true })} tone={netMonthly < 0 ? 'bad' : 'ok'} />
                  <RowKV label="Annualisé"            value={fmtCHF(result.annualNet, { sign: true })} />
                  <RowKV label="Payback"              value={budget > 0 && payback !== Infinity ? `${payback.toFixed(1).replace('.', ',')} mois` : '—'} />
                  <RowKV label="Taux de récupération" value={fmtPct(result.recoveryRatio, 0)} />
                </div>
              </div>
            </div>

            {/* Customer economics */}
            <CustomerEconomics result={result} country={country} lifecycle={lc} inputs={inputs} />

            {/* Leak breakdown */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Fuites vs médiane {ind.name}</div>
                  <div className="t-caption text-mute mt-1">CHF / mois</div>
                </div>
                <div className="t-num text-accent tabular-nums">
                  <AnimNum value={result.totalLeak} format={fmtCHF} />
                </div>
              </div>
              <div className="divide-y hair">
                {sortedBuckets.map((b, i) => {
                  const pct = result.totalLeak > 0 ? b.value / result.totalLeak : 0;
                  const priority = i === 0;
                  return (
                    <div key={b.id} className="py-4 grid grid-cols-[20px_1fr_220px_140px] items-center gap-4">
                      <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="t-body text-ink">{b.label}</span>
                          {priority && <span className="t-caption text-accent">Prioritaire</span>}
                        </div>
                        <div className="t-caption text-mute mt-1 normal-case tracking-normal leading-relaxed"
                             style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                          {b.hint}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-[3px] bg-line2 relative overflow-hidden flex-1">
                          <div className={cn('h-full', priority ? 'bg-accent' : 'bg-ink/60')}
                               style={{ width: `${pct * 100}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <span className="t-caption text-mute tabular-nums shrink-0">{fmtPct(pct, 0)}</span>
                      </div>
                      <div className="text-right">
                        <div className="t-num text-ink num tabular-nums">
                          <AnimNum value={b.value} format={fmtCHF} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendation */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 inline-flex items-center justify-center border hair bg-paper shrink-0 mt-0.5">
                <IconSpark size={13} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="t-caption text-accent">Recommandation Pupsic</div>
                <p className="t-bodyhi mt-1.5 max-w-[720px] text-ink">
                  {priorityObj ? (
                    <>Vous avez priorisé <span className="underline underline-offset-2 decoration-accent">{priorityObj.label.toLowerCase()}</span> — en stade <span className="text-accent">{lc.name}</span>{score.score > 0 ? <> avec un score <span className="text-accent num">{score.score}/100</span> ({tierMeta.label})</> : null}, Pupsic recommande un budget de <span className="text-accent num">{fmtCHF(Math.max(800, Math.round(result.sat * lc.recommendedBudgetMult)))}</span> / mois pour viser un LTV:CAC ≥ <span className="num">{lc.ltvCacTarget.toFixed(1).replace('.', ',')}</span> et un payback ≤ <span className="num">{lc.cacPaybackTargetMo} mois</span>.</>
                  ) : (
                    <>Concentrez l'effort sur <span className="underline underline-offset-2 decoration-accent">{top.label.toLowerCase()}</span> — ce levier seul représente <span className="text-accent num">{fmtCHF(top.value * 12)}</span> récupérables sur 12 mois en stade <span className="text-accent">{lc.name}</span>.</>
                  )}
                </p>
                {score.score > 0 && (
                  <p className="t-body text-mute mt-1.5 max-w-[720px]">
                    <span className="text-accent">Tier {tierMeta.label} ·</span> {tierMeta.hint}
                  </p>
                )}
                <p className="t-body text-mute mt-1.5 max-w-[720px]">
                  Mise en place type · 3 semaines · audit Pupsic + outillage Klaviyo / HubSpot / Aircall + cadrage SLA équipe.
                </p>
                <div className="mt-3.5">
                  <Button variant="primary" size="sm" iconRight={<IconArrowRight size={13}/>} onClick={() => go('app/mmm')}>
                    Passer au mix média
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── KV row (flat) ──────────────────────────────────────────────────────
function RowKV({ label, value, accent, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="t-body text-mute">{label}</span>
      <span className={cn('t-num tabular-nums',
        accent ? 'text-accent' : tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-ink')}>{value}</span>
    </div>
  );
}

// ── Budget recovery curve ──────────────────────────────────────────────
function BudgetCurve({ totalLeak, sat, budget }) {
  const maxBudget = Math.max(sat * 5, budget * 1.4, 6000);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const b = (maxBudget * i) / 40;
    const r = totalLeak * (1 - Math.exp(-b / sat));
    pts.push({ b, r });
  }
  const xs = pts.map((p, i) => (i / 40) * 100);
  const ys = pts.map(p => 90 - (totalLeak > 0 ? (p.r / totalLeak) * 80 : 0));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(' ');
  const area = `${path} L 100 90 L 0 90 Z`;
  const hx = clamp((budget / maxBudget) * 100, 0, 100);
  const hr = totalLeak * (1 - Math.exp(-budget / sat));
  const hy = 90 - (totalLeak > 0 ? (hr / totalLeak) * 80 : 0);

  return (
    <div>
      <svg viewBox="0 0 100 100" className="w-full h-[180px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curveGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2="100" y1="90" y2="90" stroke="rgba(19,16,34,0.15)" strokeWidth="0.4" />
        <line x1="0" x2="100" y1="10" y2="10" stroke="rgba(19,16,34,0.10)" strokeWidth="0.4" strokeDasharray="0.8 0.8" />
        <path d={area} fill="url(#curveGrad)" />
        <path d={path} stroke="#8D0AF5" strokeWidth="1.4" fill="none" vectorEffect="non-scaling-stroke" />
        <line x1={hx} x2={hx} y1="8" y2="90" stroke="#8D0AF5" strokeOpacity="0.4" strokeWidth="0.5" strokeDasharray="1.2 1.2" />
        <circle cx={hx} cy={hy} r="2" fill="#8D0AF5" stroke="#fafafd" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex items-center justify-between mt-2">
        <div className="t-caption text-mute">Budget</div>
        <div className="t-caption text-mute">Récupération max</div>
      </div>
    </div>
  );
}

// ── Customer economics (flat) ──────────────────────────────────────────
function CustomerEconomics({ result, country, lifecycle, inputs }) {
  const { newCustomers, cac, ltv, ltvCacRatio, cacPaybackMonths,
          ltvCacTarget, cacPaybackTarget, ltvCacHealth, cacPaybackHealth, margin } = result;

  const ratioPct = ltvCacRatio === Infinity ? 1 : clamp(ltvCacRatio / (ltvCacTarget * 1.5), 0, 1);
  const paybackPct = cac > 0 ? clamp(cacPaybackMonths / (cacPaybackTarget * 2), 0, 1) : 0;

  const toneClass = (h) =>
    h === 'ok'   ? 'text-ok'
    : h === 'warn' ? 'text-warn'
    : h === 'bad'  ? 'text-bad'
    : 'text-mute';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="t-bodyhi text-ink">Économie client</div>
          <div className="t-caption text-mute mt-1">
            {country.flag} {country.id} · CAC ×{country.cacIndex.toFixed(2).replace('.', ',')} · {lifecycle.name}
          </div>
        </div>
      </div>

      {/* 4-col KPI strip — flat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pb-8 mb-8 border-b hair">
        <div>
          <div className="t-caption text-mute">Nouveaux clients / mois</div>
          <div className="t-num text-ink mt-2"><AnimNum value={Math.round(newCustomers)} format={fmtNum} /></div>
          <div className="t-body text-mute mt-1.5">sur {fmtNum(inputs.leadsMois)} leads · marge {fmtPct(margin, 0)}</div>
        </div>
        <div>
          <div className="t-caption text-mute">CAC · {country.id}</div>
          <div className="t-num text-ink mt-2"><AnimNum value={cac} format={(v) => v > 0 ? fmtCHF(v) : '—'} /></div>
          <div className="t-body text-mute mt-1.5">
            {inputs.revopsBudget > 0
              ? <>×{country.cacIndex.toFixed(2).replace('.', ',')} ÷ {Math.round(newCustomers)} clients</>
              : <>Activez un budget RevOps</>}
          </div>
        </div>
        <div>
          <div className="t-caption text-mute">LTV estimé</div>
          <div className="t-num text-accent mt-2"><AnimNum value={ltv} format={fmtCHF} /></div>
          <div className="t-body text-mute mt-1.5">panier × ×{(result.industry?.ltvMult || 2.5).toFixed(1).replace('.', ',')}</div>
        </div>
        <div>
          <div className="t-caption text-mute">Contribution / client</div>
          <div className="t-num text-ink mt-2"><AnimNum value={ltv - cac} format={(v) => fmtCHF(v, { sign: true })} /></div>
          <div className="t-body text-mute mt-1.5">LTV − CAC · {lifecycle.name}</div>
        </div>
      </div>

      {/* Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="t-caption text-mute">LTV:CAC</div>
            <div className="t-caption text-mute">
              Cible <span className="num text-ink">≥ {ltvCacTarget.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div className={cn('t-hero num tabular-nums', toneClass(ltvCacHealth))}>
              <AnimNum value={ltvCacRatio === Infinity ? 0 : ltvCacRatio}
                       format={(v) => (cac > 0 && ltvCacRatio !== Infinity) ? `${v.toFixed(1).replace('.', ',')}×` : '—'} />
            </div>
            <span className={cn('t-caption', toneClass(ltvCacHealth))}>
              {ltvCacHealth === 'ok' ? 'Sain' : ltvCacHealth === 'warn' ? 'Tendu' : ltvCacHealth === 'bad' ? 'Sous-cible' : '—'}
            </span>
          </div>
          <div className="relative h-[3px] bg-line2">
            <div className={cn('absolute inset-y-0 left-0',
              ltvCacHealth === 'ok' ? 'bg-ok' : ltvCacHealth === 'warn' ? 'bg-warn' : ltvCacHealth === 'bad' ? 'bg-bad' : 'bg-mute')}
                 style={{ width: `${ratioPct * 100}%`, transition: 'width 300ms cubic-bezier(.4,0,.2,1)' }} />
            <div className="absolute -top-1 -bottom-1 w-px bg-ink"
                 style={{ left: `${clamp(ltvCacTarget / (ltvCacTarget * 1.5), 0, 1) * 100}%` }} />
          </div>
          <div className="t-caption text-mute mt-2 flex justify-between">
            <span>0</span>
            <span>cible</span>
            <span>1,5× cible</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="t-caption text-mute">CAC payback</div>
            <div className="t-caption text-mute">
              Cible <span className="num text-ink">≤ {cacPaybackTarget} mois</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div className={cn('t-hero num tabular-nums', toneClass(cacPaybackHealth))}>
              {cac > 0
                ? <span>{cacPaybackMonths.toFixed(1).replace('.', ',')}<span className="text-mute t-body ml-1">mois</span></span>
                : <span className="text-mute">—</span>}
            </div>
            <span className={cn('t-caption', toneClass(cacPaybackHealth))}>
              {cacPaybackHealth === 'ok' ? 'Rapide' : cacPaybackHealth === 'warn' ? 'À surveiller' : cacPaybackHealth === 'bad' ? 'Lent' : '—'}
            </span>
          </div>
          <div className="relative h-[3px] bg-line2">
            <div className={cn('absolute inset-y-0 left-0',
              cacPaybackHealth === 'ok' ? 'bg-ok' : cacPaybackHealth === 'warn' ? 'bg-warn' : cacPaybackHealth === 'bad' ? 'bg-bad' : 'bg-mute')}
                 style={{ width: `${paybackPct * 100}%`, transition: 'width 300ms cubic-bezier(.4,0,.2,1)' }} />
            <div className="absolute -top-1 -bottom-1 w-px bg-ink"
                 style={{ left: `${clamp(cacPaybackTarget / (cacPaybackTarget * 2), 0, 1) * 100}%` }} />
          </div>
          <div className="t-caption text-mute mt-2 flex justify-between">
            <span>0 mo</span>
            <span>cible</span>
            <span>{cacPaybackTarget * 2} mo</span>
          </div>
        </div>
      </div>

      <p className="t-body text-mute mt-6 max-w-[760px]">
        En <span className="text-ink">{lifecycle.name}</span>, Pupsic vise un LTV:CAC ≥ <span className="num">{lifecycle.ltvCacTarget.toFixed(1).replace('.', ',')}</span> et
        un payback ≤ <span className="num">{lifecycle.cacPaybackTargetMo} mois</span>.
        L'index CAC de <span className="text-ink">{country.name}</span> (<span className="num">×{country.cacIndex.toFixed(2).replace('.', ',')}</span>) ajuste vos coûts vs la baseline suisse.
      </p>
    </div>
  );
}

Object.assign(window, { CalculatorScreen });

// ── Funnel Health ──────────────────────────────────────────────────────
function FunnelHealth({ inputs, ind, result }) {
  const visitorConv = 0.04;
  const visitors = Math.round(inputs.leadsMois / visitorConv);
  const leads    = inputs.leadsMois;
  const opps     = Math.round(leads * inputs.conversion);
  const won      = Math.round(opps * inputs.closing);

  const stages = [
    { id: 'visitors', label: 'Visiteurs uniques',  count: visitors, conv: null,              bench: null,    target: null },
    { id: 'leads',    label: 'Leads (form fill)',  count: leads,    conv: visitorConv,       bench: 0.04,    target: 'V → L' },
    { id: 'opps',     label: 'Opportunités SQL',   count: opps,     conv: inputs.conversion, bench: ind.conv,target: 'L → O' },
    { id: 'won',      label: 'Closed-Won',         count: won,      conv: inputs.closing,    bench: ind.closing, target: 'O → W' },
  ];
  const maxCount = visitors;

  const responseHealth = inputs.responseTimeMin <= 5 ? 'ok' : inputs.responseTimeMin <= 30 ? 'warn' : 'bad';

  return (
    <div className="pb-12 mb-12 border-b hair">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="t-bodyhi text-ink">Santé du funnel · 4 étapes</div>
          <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
            Taux de conversion par étape, vs médiane {ind.name}.
          </div>
        </div>
        <span className={cn('t-caption inline-flex items-center gap-1.5',
                            responseHealth === 'ok' ? 'text-ok' : responseHealth === 'warn' ? 'text-warn' : 'text-bad')}>
          <span className={cn('w-1.5 h-1.5 rounded-full',
                              responseHealth === 'ok' ? 'bg-ok' : responseHealth === 'warn' ? 'bg-warn' : 'bg-bad')} />
          Réponse · {inputs.responseTimeMin} min
        </span>
      </div>

      <div className="space-y-3">
        {stages.map((s, i) => {
          const width = (s.count / maxCount) * 100;
          const delta = s.bench != null ? (s.conv / s.bench - 1) * 100 : null;
          const tone = delta == null ? 'neutral'
                     : delta >= -5  ? 'ok'
                     : delta >= -25 ? 'warn'
                     : 'bad';
          return (
            <div key={s.id} className="grid grid-cols-[20px_180px_1fr_110px_110px] items-center gap-4">
              <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="t-body text-ink">{s.label}</div>
                {s.target && <div className="t-caption text-mute mt-1">{s.target}</div>}
              </div>
              <div className="relative h-7 bg-line2 overflow-hidden">
                <div className={cn('h-full',
                                    tone === 'ok' ? 'bg-ok/30' : tone === 'warn' ? 'bg-warn/30' : tone === 'bad' ? 'bg-bad/30' : 'bg-ink/10')}
                     style={{ width: `${width}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="t-body text-ink num tabular-nums">{fmtNum(s.count)}</span>
                </div>
              </div>
              <div className="text-right">
                {s.conv != null ? (
                  <>
                    <div className="t-body text-ink num tabular-nums">{fmtPct(s.conv, 1)}</div>
                    <div className="t-caption text-mute mt-1">conversion</div>
                  </>
                ) : (
                  <span className="t-body text-mute">—</span>
                )}
              </div>
              <div className="text-right">
                {s.bench != null ? (
                  <>
                    <div className={cn('t-body num tabular-nums',
                                        tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-bad')}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(0)}%
                    </div>
                    <div className="t-caption text-mute mt-1">vs {fmtPct(s.bench, 1)}</div>
                  </>
                ) : (
                  <span className="t-body text-mute">benchmark</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const conversions = stages.filter(s => s.conv != null && s.bench != null)
                                  .map(s => ({ ...s, gap: (s.conv / s.bench - 1) }));
        const worst = conversions.sort((a, b) => a.gap - b.gap)[0];
        if (!worst || worst.gap > -0.05) return null;
        return (
          <div className="mt-6 pt-5 border-t hair flex items-start gap-3">
            <span className="t-caption text-bad shrink-0 mt-0.5">Goulot</span>
            <p className="t-body text-ink max-w-[640px]">
              <span className="text-ink">{worst.target}</span> performe à {fmtPct(worst.conv, 1)} vs médiane {fmtPct(worst.bench, 1)}
              ({(worst.gap * 100).toFixed(0)}%). Concentrez les actions correctives ici en priorité.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// ── Multi-touch attribution ─────────────────────────────────────────────
function MultiTouchAttribution({ inputs, ind }) {
  const touchpoints = [
    { id: 'gsearch',   label: 'Paid Search',          hue: '#131022', first: 0.28, last: 0.06 },
    { id: 'seo',       label: 'Organic Search · SEO', hue: '#6e6a85', first: 0.22, last: 0.18 },
    { id: 'content',   label: 'Content · PR · blog',  hue: '#a40fa9', first: 0.08, last: 0.05 },
    { id: 'social_p',  label: 'Paid Social',          hue: '#8D0AF5', first: 0.10, last: 0.03 },
    { id: 'social_o',  label: 'Organic Social',       hue: '#FD89FF', first: 0.06, last: 0.04 },
    { id: 'email',     label: 'Email · nurturing',    hue: '#c576f0', first: 0.04, last: 0.22 },
    { id: 'referral',  label: 'Referral · advocacy',  hue: '#3E0CB7', first: 0.12, last: 0.10 },
    { id: 'outbound',  label: 'Sales Outbound',       hue: '#2F2748', first: 0.05, last: 0.18 },
    { id: 'direct',    label: 'Direct / branded',     hue: '#bfbacf', first: 0.05, last: 0.14 },
  ];
  const maxBar = Math.max(...touchpoints.map(t => Math.max(t.first, t.last)));

  return (
    <div className="pb-12 mb-12 border-b hair">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="t-bodyhi text-ink">Attribution multi-touch · découverte vs closing</div>
          <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
            Où vos leads vous découvrent (first touch) vs où ils convertissent (last touch). Source : Forrester B2B Buyer Journey 2024.
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="t-caption inline-flex items-center gap-1.5 text-mute">
            <span className="inline-block w-3 h-[3px] bg-mute" /> First touch
          </span>
          <span className="t-caption inline-flex items-center gap-1.5 text-accent">
            <span className="inline-block w-3 h-[3px] bg-accent" /> Last touch
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3">
        {touchpoints.map(t => {
          const gap = t.last - t.first;
          return (
            <div key={t.id} className="grid grid-cols-[10px_1fr_88px] items-center gap-3 py-2 border-b hair">
              <span className="w-1.5 h-1.5 shrink-0" style={{ background: t.hue }} />
              <div className="min-w-0">
                <div className="t-body text-ink truncate">{t.label}</div>
                <div className="relative h-3 mt-1.5">
                  <div className="absolute top-0 left-0 h-[5px] bg-mute/60"
                       style={{ width: `${(t.first / maxBar) * 100}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                  <div className="absolute bottom-0 left-0 h-[5px] bg-accent"
                       style={{ width: `${(t.last / maxBar) * 100}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                </div>
              </div>
              <div className="text-right t-body num tabular-nums">
                <span className="text-mute">{fmtPct(t.first, 0)}</span>
                <span className="text-line mx-0.5">→</span>
                <span className={cn(gap > 0.05 ? 'text-accent' : gap < -0.05 ? 'text-bad' : 'text-ink')}>
                  {fmtPct(t.last, 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="t-body text-mute mt-5 max-w-[720px]">
        <span className="text-ink">Email</span> et <span className="text-ink">Outbound</span> sur-convertissent par rapport à leur poids
        en découverte — ce sont vos leviers de closing. <span className="text-ink">Paid Search</span> ouvre la porte mais ne ferme pas seul.
      </p>
    </div>
  );
}
