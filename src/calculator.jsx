// RevOps Calculator — driven by onboarding profile + RevOps budget impact
// FieldSlider lives in lib.jsx (shared with onboarding).

function InputGroup({ title, children, trailing }) {
  return (
    <div className="border-t hair first:border-t-0">
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">{title}</div>
        {trailing}
      </div>
      <div className="px-5 pb-5 pt-2 space-y-4">{children}</div>
    </div>
  );
}

function CalculatorScreen({ user, plan, profile, scenarios, addScenario, updateScenario, focusScenarioId, go }) {
  const focused = scenarios.find(s => s.id === focusScenarioId);

  // Pre-fill from focused scenario OR from onboarding profile + industry medians.
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

  // Recompute leads + benchmarks if user swaps industry mid-flight (only if they haven't customized)
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

  // Continuum: realised / optimised
  const continuumPct = result.optimised > 0 ? result.realised / result.optimised : 0;
  const sortedBuckets = result.buckets.slice().sort((a, b) => b.value - a.value);
  const top = sortedBuckets[0];

  // Severity / quality of pipeline vs industry
  const roiPct = result.roi;
  const roiBadge = roiPct >= 0.35 ? { tone: 'bad',  label: 'Fuite critique' }
                 : roiPct >= 0.15 ? { tone: 'warn', label: 'Marge d\'optimisation' }
                 : { tone: 'ok',   label: 'Pipeline sain' };

  // Recovery numbers
  const netMonthly = result.netMonthly;
  const recovered = result.recovered;
  const budget = result.budget;
  const payback = result.paybackMonths;
  const heroNet = budget > 0 ? netMonthly : recovered;
  const heroIsNet = budget > 0;

  return (
    <PageShell user={user} plan={plan} currentScreen="app/calculator" go={go} logout={() => go('login')}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 lg:py-10">

        {/* ─── Top bar ────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-7">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone="line" className="mono">REVOPS CALCULATOR</Badge>
            <Badge tone={roiBadge.tone} className="mono">{roiBadge.label.toUpperCase()}</Badge>
            {score.score > 0 && (
              <Badge tone={tierMeta.tone} className="mono">
                SCORE {score.score}/100 · {tierMeta.label.toUpperCase()}
              </Badge>
            )}
            <span className="text-[12px] text-mute">
              <span className="text-ink font-semibold">{ind.name}</span> ·
              <span className="ml-1">{country.flag} {country.name}</span>
              <span className="text-mute"> · CAC ×{country.cacIndex.toFixed(2).replace('.', ',')}</span>
              <span className="mx-1">·</span>
              <span className="text-ink font-semibold">{lc.icon} {lc.name}</span>
              <span className="text-mute"> · {lc.short}</span>
              <span className="mx-1">·</span>
              <span>{fmtCHFShort(inputs.caAnnuel)} / an</span>
            </span>
            <button onClick={() => go('app/onboarding')} className="text-[12px] text-mute hover:text-ink underline underline-offset-4 decoration-line">
              Modifier le profil
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} className="w-[260px]" prefix="#" />
            <Button variant="primary" icon={<IconSave size={14}/>} onClick={save} disabled={atCap}>
              {savedId ? 'Mettre à jour' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        {/* ─── HERO ───────────────────────────────────────────────────── */}
        <Card padded={false} className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">

            {/* LEFT — recovery headline */}
            <div className="p-7 lg:p-10">
              <div className="mono text-[11px] uppercase tracking-[0.06em] text-mute">
                {budget > 0
                  ? `Avec ${fmtCHF(budget)} / mois en RevOps, vous récupérez net`
                  : 'Sans budget RevOps, votre fuite mensuelle s\'élève à'}
              </div>
              <div className={cn('display text-[64px] lg:text-[84px] leading-[0.92] font-bold tracking-[-0.035em] mt-4 num',
                                  heroIsNet && heroNet < 0 ? 'text-bad' : 'text-accent')}>
                <AnimNum value={heroNet} format={(v) => fmtCHF(v, { sign: true })} />
              </div>
              <div className="text-[13.5px] text-mute mt-3 max-w-[520px] leading-snug">
                {budget > 0 ? (
                  <>
                    Soit <span className="text-ink font-semibold num">{fmtCHF(result.annualNet)}</span> de top-line annuel net.
                    Payback en <span className="text-ink font-semibold">{payback === Infinity ? '—' : `${payback.toFixed(1).replace('.', ',')} mois`}</span>.
                  </>
                ) : (
                  <>
                    Soit <span className="text-ink font-semibold num">{fmtCHF(result.totalLeak * 12)}</span> récupérables / an.
                    Activez un budget RevOps pour modéliser l'impact.
                  </>
                )}
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <Button variant="accent" size="md" icon={<IconWand size={13}/>} onClick={() => go('app/mmm')}>
                  Allouer un mix média
                </Button>
                <Button variant="ghost" size="md" onClick={() => setI('revopsBudget', Math.max(800, Math.round(result.sat * lc.recommendedBudgetMult)))}>
                  Budget recommandé · {lc.name}
                </Button>
              </div>
            </div>

            {/* RIGHT — pipeline continuum */}
            <div className="bg-paper2/60 border-t lg:border-t-0 lg:border-l hair p-7 lg:p-9 flex flex-col justify-between gap-7">
              <div>
                <div className="mono text-[10.5px] uppercase tracking-[0.06em] text-mute mb-3">Pipeline · mensuel</div>
                <div className="relative h-2 bg-line2 mb-2">
                  <div className="absolute inset-y-0 left-0 bg-ink transition-all duration-300"
                       style={{ width: `${continuumPct * 100}%` }} />
                  <div className="absolute inset-y-0 transition-all duration-300"
                       style={{ left: `${continuumPct * 100}%`, right: 0,
                                background: 'repeating-linear-gradient(135deg, rgba(141,10,245,0.18) 0 4px, transparent 4px 8px)' }} />
                </div>
                <div className="flex justify-between text-[11px]">
                  <div>
                    <div className="mono text-mute uppercase text-[10px]">Réalisé</div>
                    <div className="display text-[20px] font-semibold tracking-tight num mt-0.5">
                      <AnimNum value={result.realised} format={fmtCHF} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-accent uppercase text-[10px]">Optimisé · médiane {ind.name}</div>
                    <div className="display text-[20px] font-semibold tracking-tight num mt-0.5 text-accent">
                      <AnimNum value={result.optimised} format={fmtCHF} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 border-t hair -mx-1">
                <div className="px-2 pt-3">
                  <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Fuite</div>
                  <div className="display text-[22px] font-semibold tracking-tight mt-1.5 num">
                    <AnimNum value={result.totalLeak} format={fmtCHFShort} />
                  </div>
                </div>
                <div className="px-2 pt-3 border-l hair">
                  <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Récupérée</div>
                  <div className="display text-[22px] font-semibold tracking-tight mt-1.5 num text-accent">
                    <AnimNum value={recovered} format={fmtCHFShort} />
                  </div>
                </div>
                <div className="px-2 pt-3 border-l hair">
                  <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Payback</div>
                  <div className="display text-[22px] font-semibold tracking-tight mt-1.5">
                    {budget > 0 && payback !== Infinity ? <span className="num">{payback.toFixed(1).replace('.', ',')}<span className="text-mute text-[11px] font-normal"> mois</span></span> : <span className="text-mute">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── 2-pane: inputs + outputs ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3 mt-3">

          {/* INPUTS */}
          <Card padded={false} className="self-start lg:sticky lg:top-[80px]">
            <div className="px-5 py-4 border-b hair flex items-center justify-between">
              <div className="display text-[15px] font-semibold tracking-tight">Réglages</div>
              <button onClick={() => setInputs(initialInputs)} className="text-[10.5px] text-mute hover:text-ink mono uppercase tracking-[0.06em]">
                Reset
              </button>
            </div>

            {/* The star: RevOps budget */}
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
                hint={`Médiane ${ind.name} · ${fmtPct(ind.conv, 0)}`}
                onChange={v => setI('conversion', v)} />
              <FieldSlider label="Closing opportunité → won"
                value={inputs.closing} min={0.05} max={0.7} step={0.01}
                format={(v) => fmtPct(v)}
                benchmark={ind.closing}
                benchmarkLabel={`${fmtPct(ind.closing, 0)} médian ${ind.name}`}
                hint={`Médiane ${ind.name} · ${fmtPct(ind.closing, 0)}`}
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
                hint="Forrester : −10% win-rate au-delà de 5 min."
                onChange={v => setI('responseTimeMin', v)} />
              <FieldSlider label="Équipe commerciale"
                value={inputs.equipe} min={1} max={60} step={1}
                format={(v) => `${v} pers.`}
                benchmark={Math.max(1, Math.round(inputs.leadsMois / 150))}
                benchmarkLabel="~150 leads / pers."
                hint="Capacité durable · ~150 leads / mois / personne."
                onChange={v => setI('equipe', v)} />
            </InputGroup>
          </Card>

          {/* OUTPUTS */}
          <div className="space-y-3 min-w-0">

            {/* RevOps budget impact card */}
            <Card padded={false}>
              <div className="px-5 py-4 border-b hair flex items-center justify-between">
                <div className="display text-[15px] font-semibold tracking-tight flex items-center gap-2">
                  <IconWand size={14} className="text-accent" /> Impact du budget RevOps
                </div>
                <div className="mono text-[10.5px] text-mute uppercase tracking-[0.06em]">
                  COURBE DE RÉCUPÉRATION
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <BudgetCurve totalLeak={result.totalLeak} sat={result.sat} budget={budget} />
                <div className="space-y-3">
                  <RowKV label="Budget RevOps / mois"        value={fmtCHF(budget)} />
                  <RowKV label="Fuite récupérée"            value={fmtCHF(recovered)} accent />
                  <RowKV label="Net mensuel"                value={fmtCHF(netMonthly, { sign: true })} tone={netMonthly < 0 ? 'bad' : 'ok'} />
                  <RowKV label="Annualisé"                  value={fmtCHF(result.annualNet, { sign: true })} />
                  <RowKV label="Payback"                    value={budget > 0 && payback !== Infinity ? `${payback.toFixed(1).replace('.', ',')} mois` : '—'} />
                  <RowKV label={`Taux de récupération (sat. ${fmtCHFShort(result.sat)})`} value={fmtPct(result.recoveryRatio, 0)} />
                </div>
              </div>
            </Card>

            {/* Customer economics — country + lifecycle aware */}
            <CustomerEconomicsCard result={result} country={country} lifecycle={lc} inputs={inputs} setI={setI} />

            {/* Leak breakdown */}
            <Card padded={false}>
              <div className="px-5 py-4 border-b hair flex items-center justify-between">
                <div className="display text-[15px] font-semibold tracking-tight flex items-center gap-2">
                  <IconLeak size={14} className="text-accent" /> Fuites vs médiane {ind.name}
                </div>
                <div className="mono text-[10.5px] text-mute uppercase tracking-[0.06em]">CHF / MOIS</div>
              </div>
              <div className="divide-y hair">
                {sortedBuckets.map((b, i) => {
                  const pct = result.totalLeak > 0 ? b.value / result.totalLeak : 0;
                  const priority = i === 0;
                  return (
                    <div key={b.id} className={cn('px-5 py-4 grid grid-cols-[28px_1fr_220px_140px] gap-4 items-center',
                                                    priority && 'bg-[#fbf5ff]')}>
                      <div className="mono text-[11px] text-mute uppercase tracking-[0.06em]">{String(i + 1).padStart(2, '0')}</div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold tracking-tight flex items-center gap-2">
                          {b.label}
                          {priority && <Badge tone="accent" className="mono">PRIORITAIRE</Badge>}
                        </div>
                        <div className="text-[11.5px] text-mute mt-0.5">{b.hint}</div>
                      </div>
                      <div>
                        <div className="h-1.5 bg-line2 relative overflow-hidden">
                          <div className={cn('h-full', priority ? 'bg-accent' : 'bg-ink/60')}
                               style={{ width: `${pct * 100}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <div className="mono text-[10.5px] text-mute mt-1.5 uppercase tracking-[0.06em]">{fmtPct(pct, 0)} du total</div>
                      </div>
                      <div className="text-right">
                        <div className="display text-[19px] font-semibold tracking-tight num">
                          <AnimNum value={b.value} format={fmtCHF} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="px-5 py-4 grid grid-cols-[28px_1fr_220px_140px] gap-4 items-center bg-ink text-paper">
                  <div className="mono text-[11px] uppercase tracking-[0.06em] text-paper/60">∑</div>
                  <div className="display text-[14px] font-semibold tracking-tight">Total fuite mensuelle</div>
                  <div className="text-[11px] text-paper/60 mono uppercase tracking-[0.06em]">À reconquérir</div>
                  <div className="text-right">
                    <div className="display text-[22px] font-semibold tracking-tight num text-pink">
                      <AnimNum value={result.totalLeak} format={fmtCHF} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recommendation tied to onboarding priority */}
            <Card className="bg-[#f7eeff]">
              <div className="flex items-start gap-5">
                <div className="w-11 h-11 inline-flex items-center justify-center bg-accent text-white">
                  <IconSpark size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Recommandation Pupsic</div>
                  <p className="display text-[19px] font-semibold tracking-tight mt-1.5 leading-snug max-w-[680px]">
                    {priorityObj ? (
                      <>Vous avez priorisé <span className="underline underline-offset-4 decoration-accent">{priorityObj.label.toLowerCase()}</span> — en stade <span className="text-accent">{lc.name}</span>{score.score > 0 ? <> avec un score <span className="text-accent num">{score.score}/100</span> ({tierMeta.label})</> : null}, Pupsic recommande un budget de <span className="text-accent num">{fmtCHF(Math.max(800, Math.round(result.sat * lc.recommendedBudgetMult)))}</span> / mois pour viser un LTV:CAC ≥ <span className="num">{lc.ltvCacTarget.toFixed(1).replace('.', ',')}</span> et un payback ≤ <span className="num">{lc.cacPaybackTargetMo} mois</span>.</>
                    ) : (
                      <>Concentrez l'effort sur <span className="underline underline-offset-4 decoration-accent">{top.label.toLowerCase()}</span> — ce levier seul représente <span className="text-accent num">{fmtCHF(top.value * 12)}</span> récupérables sur 12 mois en stade <span className="text-accent">{lc.name}</span>.</>
                    )}
                  </p>
                  {score.score > 0 && (
                    <p className="text-[12px] text-mute mt-2 leading-snug max-w-[640px]">
                      <span className="mono uppercase tracking-[0.06em] text-accent">Tier {tierMeta.label} ·</span> {tierMeta.hint}
                    </p>
                  )}
                  <p className="text-[12.5px] text-mute mt-2 leading-snug max-w-[640px]">
                    Mise en place type · 3 semaines · audit Pupsic + outillage Klaviyo / HubSpot / Aircall + cadrage SLA équipe.
                  </p>
                </div>
                <Button variant="ghost" size="sm" iconRight={<IconArrowRight size={13}/>} onClick={() => go('app/mmm')}>
                  Passer au mix média
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// Tiny KV row used in the budget impact card
function RowKV({ label, value, accent, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b hair last:border-b-0">
      <span className="text-[12px] text-mute">{label}</span>
      <span className={cn('display text-[15px] font-semibold tracking-tight num',
        accent && 'text-accent',
        tone === 'ok' && 'text-ok',
        tone === 'bad' && 'text-bad')}>{value}</span>
    </div>
  );
}

// SVG recovery curve: recovered = totalLeak * (1 - exp(-budget/sat))
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
            <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line x1="0" x2="100" y1="90" y2="90" stroke="rgba(19,16,34,0.15)" strokeWidth="0.4" />
        <line x1="0" x2="100" y1="10" y2="10" stroke="rgba(19,16,34,0.10)" strokeWidth="0.4" strokeDasharray="0.8 0.8" />
        {/* curve */}
        <path d={area} fill="url(#curveGrad)" />
        <path d={path} stroke="#8D0AF5" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" />
        {/* point */}
        <line x1={hx} x2={hx} y1="8" y2="90" stroke="#8D0AF5" strokeOpacity="0.4" strokeWidth="0.5" strokeDasharray="1.2 1.2" />
        <circle cx={hx} cy={hy} r="2.2" fill="#8D0AF5" stroke="#fafafd" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex items-center justify-between mt-1">
        <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Budget</div>
        <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Récupération max</div>
      </div>
    </div>
  );
}

// ─── Customer Economics card ─────────────────────────────────────────────
// Country-aware CAC, lifecycle-aware LTV:CAC + payback targets.
function CustomerEconomicsCard({ result, country, lifecycle, inputs, setI }) {
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
    <Card padded={false}>
      <div className="px-5 py-4 border-b hair flex items-center justify-between gap-3 flex-wrap">
        <div className="display text-[15px] font-semibold tracking-tight flex items-center gap-2">
          <IconUser size={14} className="text-accent" /> Économie client
        </div>
        <div className="mono text-[10.5px] text-mute uppercase tracking-[0.06em] flex items-center gap-3 flex-wrap">
          <span>{country.flag} {country.id} · CAC ×{country.cacIndex.toFixed(2).replace('.', ',')}</span>
          <span>·</span>
          <span>{lifecycle.icon} {lifecycle.name} · cibles {lifecycle.short}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-b hair">
        {/* New customers */}
        <div className="p-5 border-r hair">
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Nouveaux clients / mois</div>
          <div className="display text-[28px] font-semibold tracking-tight num mt-2">
            <AnimNum value={Math.round(newCustomers)} format={fmtNum} />
          </div>
          <div className="text-[10.5px] text-mute mt-1.5">
            sur {fmtNum(inputs.leadsMois)} leads · marge {fmtPct(margin, 0)}
          </div>
        </div>

        {/* CAC */}
        <div className="p-5 border-r hair">
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">CAC · {country.id}</div>
          <div className="display text-[28px] font-semibold tracking-tight num mt-2">
            <AnimNum value={cac} format={(v) => v > 0 ? fmtCHF(v) : '—'} />
          </div>
          <div className="text-[10.5px] text-mute mt-1.5">
            {inputs.revopsBudget > 0
              ? <>RevOps × pays {country.cacIndex.toFixed(2).replace('.', ',')} ÷ {Math.round(newCustomers)} clients</>
              : <>Activez un budget RevOps pour calculer</>}
          </div>
        </div>

        {/* LTV */}
        <div className="p-5 border-r hair">
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">LTV estimé</div>
          <div className="display text-[28px] font-semibold tracking-tight num mt-2 text-accent">
            <AnimNum value={ltv} format={fmtCHF} />
          </div>
          <div className="text-[10.5px] text-mute mt-1.5">
            panier × ×{(result.industry?.ltvMult || 2.5).toFixed(1).replace('.', ',')} × marge
          </div>
        </div>

        {/* Net contribution */}
        <div className="p-5">
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Contribution / client</div>
          <div className="display text-[28px] font-semibold tracking-tight num mt-2">
            <AnimNum value={ltv - cac} format={(v) => fmtCHF(v, { sign: true })} />
          </div>
          <div className="text-[10.5px] text-mute mt-1.5">LTV − CAC, ajusté {lifecycle.name}</div>
        </div>
      </div>

      {/* Targets — LTV:CAC ratio + Payback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-5 border-r hair">
          <div className="flex items-baseline justify-between mb-2">
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">LTV:CAC</div>
            <div className="text-[10.5px] text-mute">
              Cible {lifecycle.name} <span className="num text-ink font-semibold">≥ {ltvCacTarget.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div className={cn('display text-[34px] font-semibold tracking-tight num', toneClass(ltvCacHealth))}>
              <AnimNum value={ltvCacRatio === Infinity ? 0 : ltvCacRatio}
                       format={(v) => (cac > 0 && ltvCacRatio !== Infinity) ? `${v.toFixed(1).replace('.', ',')}×` : '—'} />
            </div>
            <Badge tone={ltvCacHealth === 'ok' ? 'ok' : ltvCacHealth === 'warn' ? 'warn' : ltvCacHealth === 'bad' ? 'bad' : 'line'} className="mono">
              {ltvCacHealth === 'ok' ? 'SAIN' : ltvCacHealth === 'warn' ? 'TENDU' : ltvCacHealth === 'bad' ? 'SOUS-CIBLE' : '—'}
            </Badge>
          </div>
          <div className="relative h-1.5 bg-line2">
            <div className={cn('absolute inset-y-0 left-0',
              ltvCacHealth === 'ok' ? 'bg-ok' : ltvCacHealth === 'warn' ? 'bg-warn' : ltvCacHealth === 'bad' ? 'bg-bad' : 'bg-mute')}
                 style={{ width: `${ratioPct * 100}%`, transition: 'width 300ms cubic-bezier(.4,0,.2,1)' }} />
            <div className="absolute top-0 bottom-0 w-px bg-ink"
                 style={{ left: `${clamp(ltvCacTarget / (ltvCacTarget * 1.5), 0, 1) * 100}%` }} />
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute mt-1.5 flex justify-between">
            <span>0</span>
            <span>cible</span>
            <span>1.5× cible</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">CAC payback</div>
            <div className="text-[10.5px] text-mute">
              Cible {lifecycle.name} <span className="num text-ink font-semibold">≤ {cacPaybackTarget} mois</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div className={cn('display text-[34px] font-semibold tracking-tight num', toneClass(cacPaybackHealth))}>
              {cac > 0
                ? <span>{cacPaybackMonths.toFixed(1).replace('.', ',')}<span className="text-mute text-[12px] font-normal"> mois</span></span>
                : <span className="text-mute">—</span>}
            </div>
            <Badge tone={cacPaybackHealth === 'ok' ? 'ok' : cacPaybackHealth === 'warn' ? 'warn' : cacPaybackHealth === 'bad' ? 'bad' : 'line'} className="mono">
              {cacPaybackHealth === 'ok' ? 'RAPIDE' : cacPaybackHealth === 'warn' ? 'À SURVEILLER' : cacPaybackHealth === 'bad' ? 'LENT' : '—'}
            </Badge>
          </div>
          <div className="relative h-1.5 bg-line2">
            <div className={cn('absolute inset-y-0 left-0',
              cacPaybackHealth === 'ok' ? 'bg-ok' : cacPaybackHealth === 'warn' ? 'bg-warn' : cacPaybackHealth === 'bad' ? 'bg-bad' : 'bg-mute')}
                 style={{ width: `${paybackPct * 100}%`, transition: 'width 300ms cubic-bezier(.4,0,.2,1)' }} />
            <div className="absolute top-0 bottom-0 w-px bg-ink"
                 style={{ left: `${clamp(cacPaybackTarget / (cacPaybackTarget * 2), 0, 1) * 100}%` }} />
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute mt-1.5 flex justify-between">
            <span>0 mo</span>
            <span>cible</span>
            <span>{cacPaybackTarget * 2} mo</span>
          </div>
        </div>
      </div>

      {/* Stage / country narrative */}
      <div className="px-5 py-4 border-t hair bg-paper2/50 text-[12px] text-mute leading-relaxed">
        En <span className="text-ink font-semibold">{lifecycle.name}</span> ({lifecycle.short}), Pupsic vise un LTV:CAC ≥ <span className="num">{lifecycle.ltvCacTarget.toFixed(1).replace('.', ',')}</span> et un payback ≤ <span className="num">{lifecycle.cacPaybackTargetMo} mois</span>.{' '}
        L'index CAC de <span className="text-ink font-semibold">{country.name}</span> (<span className="num">×{country.cacIndex.toFixed(2).replace('.', ',')}</span>) ajuste vos coûts d'acquisition vs la baseline suisse.
      </div>
    </Card>
  );
}

Object.assign(window, { CalculatorScreen });
