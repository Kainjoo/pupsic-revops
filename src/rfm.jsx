// RFM Segmentation — flat editorial layout (Dashboard pattern)
// Strict type scale: t-caption / t-bodyhi / t-num / t-hero / t-body.
// Hairline section dividers. No Cards. Accent reserved for primary outcomes.

function RFMScreen({ user, plan, profile, scenarios, go }) {
  if (!planAllows(plan, 'growth')) {
    return (
      <PageShell user={user} plan={plan} currentScreen="app/rfm" go={go} logout={() => go('login')}>
        <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">
          <GatedPanel need="growth" plan={plan} onUpgrade={() => go('pricing')}
            title="Segmentation RFM"
            copy="Décomposez votre base active en Champions / Loyal / Casual / At-risk. Disponible sur Growth et Pro." />
        </div>
      </PageShell>
    );
  }

  // ── Derive customer economics from profile ──
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const panier = scenarios?.[0]?.inputs?.panier ?? ind.panier ?? 1850;
  const arpuMonthly = ind.arpuMonthly ?? (panier / 12);
  const lc = LIFECYCLES[profile?.lifecycle] || LIFECYCLES.growth;
  const margin = lc.marginOverride != null ? lc.marginOverride : (ind.margin || 0.6);

  // Active base from CA
  const totalCustomers = useMemo(() => {
    if (profile?.caAnnuel && arpuMonthly > 0) {
      const blendedYearlyArpu = arpuMonthly * 12 * 0.85;
      return clamp(Math.round((profile.caAnnuel * 0.70) / blendedYearlyArpu), 30, 50000);
    }
    return 320;
  }, [profile?.caAnnuel, arpuMonthly]);

  // Editable RFM mix
  const [shares, setShares] = useState(
    RFM_SEGMENTS.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {})
  );
  const setShare = (id, v) => setShares(prev => ({ ...prev, [id]: clamp(v, 0, 1) }));
  const totalShare = Object.values(shares).reduce((a, b) => a + b, 0);

  const norm = useMemo(() => {
    const s = totalShare || 1;
    return Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, v / s]));
  }, [shares, totalShare]);

  const segments = useMemo(() => RFM_SEGMENTS.map(s => {
    const count = totalCustomers * (norm[s.id] || 0);
    const monthlyValue = count * arpuMonthly * s.monthlyValueMult;
    const annualValue  = monthlyValue * 12;
    const ltv = s.retentionMonthly < 1
      ? (arpuMonthly * s.monthlyValueMult * margin) / (1 - s.retentionMonthly)
      : arpuMonthly * s.monthlyValueMult * margin * 36;
    const expectedLifetimeMo = 1 / (1 - s.retentionMonthly);
    return { ...s, count, monthlyValue, annualValue, ltv, expectedLifetimeMo };
  }), [norm, totalCustomers, arpuMonthly, margin]);

  const totalMonthlyValue = segments.reduce((a, s) => a + s.monthlyValue, 0);
  const totalAnnualValue  = segments.reduce((a, s) => a + s.annualValue, 0);
  const blendedRetention  = segments.reduce((a, s) => a + (norm[s.id] || 0) * s.retentionMonthly, 0);
  const blendedLTV        = segments.reduce((a, s) => a + (norm[s.id] || 0) * s.ltv, 0);
  const champShare = segments.find(s => s.id === 'champions')?.annualValue || 0;
  const champRevPct = totalAnnualValue > 0 ? champShare / totalAnnualValue : 0;

  const retentionCurve = useMemo(() => {
    const months = 12;
    const out = [];
    for (let m = 0; m <= months; m++) {
      const survivors = segments.reduce((a, s) => a + s.count * Math.pow(s.retentionMonthly, m), 0);
      out.push({ m, survivors, pct: totalCustomers > 0 ? survivors / totalCustomers : 0 });
    }
    return out;
  }, [segments, totalCustomers]);

  const actions = {
    champions: { tone: 'accent', title: 'Programme VIP & advocacy',
                 copy: 'Concentrer le NPS, les early access et les programmes de parrainage. CAC payback < 1 mois.' },
    loyal:     { tone: 'ok',     title: 'Upsell & cross-sell séquentiel',
                 copy: 'Cycles d\'upgrade trimestriels. Segment où les playbooks ABM rapportent le plus.' },
    casual:    { tone: 'warn',   title: 'Activation & nurturing',
                 copy: 'Email automatisé + re-engagement paid. Objectif : déplacer 6%/mois vers Loyal.' },
    at_risk:   { tone: 'bad',    title: 'Win-back & churn prevention',
                 copy: 'CSM ping personnel + offre rétention. Coût d\'acquisition d\'un nouveau client × 5-7.' },
  };

  return (
    <PageShell user={user} plan={plan} currentScreen="app/rfm" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6 flex-wrap pb-10 mb-10 border-b hair">
          <div>
            <div className="t-caption text-mute">RFM · Segmentation</div>
            <h1 className="t-hero text-ink mt-3 max-w-[820px]">
              Votre base client, <span className="text-accent">décomposée</span>.
            </h1>
            <p className="t-body text-mute mt-3 max-w-[560px]">
              Recency × Frequency × Monetary. Quatre segments standards qui révèlent où concentrer l'effort RevOps.
            </p>
          </div>
          <div className="t-caption text-mute text-right leading-relaxed">
            Source · Bain Loyalty Effect<br/>
            Klaviyo Index 2024 · Customer.io 2024
          </div>
        </div>

        {/* ── Data source ──────────────────────────────────────────────── */}
        <RFMDataSource />

        {/* ── Outcome strip — 4 KPIs ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-12 pb-12 mb-12 border-b hair items-start">
          <div>
            <div className="t-caption text-mute">Valeur annuelle</div>
            <div className="t-hero text-accent mt-3 whitespace-nowrap">
              <AnimNum value={totalAnnualValue} format={fmtCHFShort} />
            </div>
            <div className="t-body text-mute mt-3 max-w-[360px]">
              Revenu généré par la base active de {fmtNum(Math.round(totalCustomers))} clients,
              au mix de segments actuel.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-6">
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">Base active</div>
              <div className="t-num text-ink mt-2"><AnimNum value={Math.round(totalCustomers)} format={fmtNum} /></div>
              <div className="t-body text-mute mt-1.5">clients · dérivés du CA</div>
            </div>
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">Rétention blendée</div>
              <div className="t-num text-ink mt-2">{fmtPct(blendedRetention, 1)}</div>
              <div className="t-body text-mute mt-1.5">{((1 - Math.pow(blendedRetention, 12)) * 100).toFixed(0)}% churn / an</div>
            </div>
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">LTV blendée</div>
              <div className="t-num text-ink mt-2">{fmtCHFShort(blendedLTV)}</div>
              <div className="t-body text-mute mt-1.5">marge {fmtPct(margin, 0)}</div>
            </div>
          </div>
        </div>

        {/* ── Pareto insight ───────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair flex items-start gap-4">
          <div className="w-8 h-8 inline-flex items-center justify-center border hair bg-paper shrink-0 mt-0.5">
            <IconSpark size={13} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="t-caption text-accent">Insight · loi de Pareto</div>
            <p className="t-bodyhi mt-1.5 max-w-[760px] text-ink">
              Les Champions représentent <span className="num">{fmtPct(norm.champions || 0, 0)}</span> de la base mais
              génèrent <span className="text-accent num">{fmtPct(champRevPct, 0)}</span> du revenu annuel.
            </p>
            <p className="t-body text-mute mt-1.5 max-w-[760px]">
              {champRevPct < 0.50 && 'Concentration faible — opportunité de hisser plus de Loyal vers Champions.'}
              {champRevPct >= 0.50 && champRevPct < 0.65 && 'Concentration saine — protégez ce noyau.'}
              {champRevPct >= 0.65 && 'Concentration élevée — un risque de dépendance se profile.'}
            </p>
          </div>
        </div>

        {/* ── Segments — flat 2×2 grid, hairline dividers ──────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Segments</div>
              <div className="t-caption text-mute mt-1">Quatre groupes standards · contribution & comportement</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {segments.map((s, i) => {
              const sharePct = norm[s.id] || 0;
              const revPct = totalAnnualValue > 0 ? s.annualValue / totalAnnualValue : 0;
              const concentration = sharePct > 0 ? revPct / sharePct : 0;
              const a = actions[s.id];
              return (
                <div key={s.id} className="pb-8 border-b hair last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <span className="w-1.5 h-1.5 shrink-0" style={{ background: s.hue }} />
                      <div>
                        <div className="t-bodyhi text-ink">{s.name}</div>
                        <div className="t-caption text-mute mt-1">
                          {s.id === 'champions' && 'Récents · fréquents · gros panier'}
                          {s.id === 'loyal'     && 'Récurrents · panier moyen'}
                          {s.id === 'casual'    && '1-2 achats · irréguliers'}
                          {s.id === 'at_risk'   && 'Inactifs > 90 jours'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="t-num text-ink">{fmtPct(sharePct, 0)}</div>
                      <div className="t-caption text-mute mt-1">de la base</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-x-4 gap-y-3 pb-5 mb-5 border-b hair">
                    <div>
                      <div className="t-caption text-mute">Clients</div>
                      <div className="t-num text-ink mt-1.5">{fmtNum(Math.round(s.count))}</div>
                    </div>
                    <div>
                      <div className="t-caption text-mute">Revenu / an</div>
                      <div className="t-num text-ink mt-1.5">{fmtCHFShort(s.annualValue)}</div>
                    </div>
                    <div>
                      <div className="t-caption text-mute">Rétention</div>
                      <div className="t-num text-ink mt-1.5">{fmtPct(s.retentionMonthly, 0)}</div>
                    </div>
                    <div>
                      <div className="t-caption text-mute">LTV</div>
                      <div className="t-num text-ink mt-1.5">{fmtCHFShort(s.ltv)}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="t-caption text-mute">Concentration revenu</span>
                      <span className={cn('t-caption tabular-nums',
                                          concentration > 1.5 ? 'text-accent' : concentration < 0.8 ? 'text-bad' : 'text-mute')}>
                        ×{concentration.toFixed(2).replace('.', ',')} · {fmtPct(revPct, 0)}
                      </span>
                    </div>
                    <div className="h-[3px] bg-line2 relative overflow-hidden">
                      <div className="h-full absolute left-0" style={{ width: `${Math.min(100, revPct * 100)}%`, background: s.hue, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>

                  <div>
                    <div className="t-caption text-mute">Playbook</div>
                    <div className="t-bodyhi text-ink mt-1.5">{a.title}</div>
                    <p className="t-body text-mute mt-1">{a.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Composition controls + Breakdown ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-12 pb-12 mb-12 border-b hair">

          {/* Controls */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="t-bodyhi text-ink">Composition de la base</div>
                <div className="t-caption text-mute mt-1">Ajustez les parts par segment</div>
              </div>
              <div className={cn('t-caption tabular-nums', Math.abs(totalShare - 1) > 0.02 ? 'text-warn' : 'text-ok')}>
                {(totalShare * 100).toFixed(0)}%
              </div>
            </div>
            <div className="space-y-5">
              {RFM_SEGMENTS.map(s => (
                <div key={s.id}>
                  <FieldSlider
                    label={
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5" style={{ background: s.hue }} />
                        <span>{s.name}</span>
                      </span>
                    }
                    value={Math.round((shares[s.id] || 0) * 100)}
                    min={0} max={100} step={1}
                    format={(v) => `${v}%`}
                    onChange={(v) => setShare(s.id, v / 100)} />
                  <div className="t-caption text-mute mt-1 normal-case tracking-normal leading-relaxed"
                       style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                    {s.hint} · valeur ×{s.monthlyValueMult.toFixed(2).replace('.', ',')} · rétention {fmtPct(s.retentionMonthly, 0)}/mois
                  </div>
                </div>
              ))}
              <button type="button"
                      onClick={() => setShares(RFM_SEGMENTS.reduce((a, s) => { a[s.id] = s.share; return a; }, {}))}
                      className="t-caption text-mute hover:text-ink underline underline-offset-2 decoration-line">
                Réinitialiser aux benchmarks
              </button>
            </div>
          </div>

          {/* Breakdown */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <div className="t-bodyhi text-ink">Contribution par segment</div>
              <div className="t-caption text-mute">CHF · annuel</div>
            </div>

            <div className="h-[3px] bg-line2 flex overflow-hidden mb-2">
              {segments.map(s => {
                const w = totalAnnualValue > 0 ? (s.annualValue / totalAnnualValue) * 100 : 0;
                return <div key={s.id} className="h-full"
                            style={{ width: `${w}%`, background: s.hue,
                                     transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />;
              })}
            </div>
            <div className="flex justify-between t-caption text-mute mb-5">
              <span>Concentration revenu</span>
              <span className="tabular-nums">{fmtPct(champRevPct, 0)} → top segment</span>
            </div>

            <div className="divide-y hair">
              {segments.map((s, i) => {
                const sharePct = norm[s.id] || 0;
                const revPct = totalAnnualValue > 0 ? s.annualValue / totalAnnualValue : 0;
                const concentration = sharePct > 0 ? revPct / sharePct : 0;
                return (
                  <div key={s.id} className="py-3 grid grid-cols-[20px_10px_1fr_140px_120px] items-center gap-4">
                    <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="w-1.5 h-1.5 shrink-0" style={{ background: s.hue }} />
                    <div className="min-w-0">
                      <div className="t-body text-ink truncate">{s.name}</div>
                      <div className="t-caption text-mute mt-1">
                        {fmtNum(Math.round(s.count))} clients · {fmtPct(sharePct, 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="t-body text-ink num tabular-nums">{fmtCHFShort(s.annualValue)}</div>
                      <div className="t-caption text-mute mt-1">{fmtPct(revPct, 0)} du revenu</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('t-body num tabular-nums',
                                          concentration > 1.5 ? 'text-accent' : concentration < 0.8 ? 'text-bad' : 'text-ink')}>
                        ×{concentration.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="t-caption text-mute mt-1">
                        {concentration > 1.5 ? 'sur-indexé' : concentration < 0.8 ? 'sous-indexé' : 'équilibré'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Retention curve + Playbooks ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-12 mb-12 border-b hair">

          <div>
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="t-bodyhi text-ink">Courbe de survie · 12 mois</div>
                <div className="t-caption text-mute mt-1">% de la base initiale encore active</div>
              </div>
            </div>
            <RetentionCurveChart curve={retentionCurve} />
            <div className="grid grid-cols-3 gap-6 mt-5 pt-5 border-t hair">
              <div>
                <div className="t-caption text-mute">M3</div>
                <div className="t-num text-ink mt-1.5">{fmtPct(retentionCurve[3]?.pct || 0, 0)}</div>
              </div>
              <div>
                <div className="t-caption text-mute">M6</div>
                <div className="t-num text-ink mt-1.5">{fmtPct(retentionCurve[6]?.pct || 0, 0)}</div>
              </div>
              <div>
                <div className="t-caption text-mute">M12</div>
                <div className="t-num text-ink mt-1.5">{fmtPct(retentionCurve[12]?.pct || 0, 0)}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="t-bodyhi text-ink">Playbooks recommandés</div>
                <div className="t-caption text-mute mt-1">Une action prioritaire par segment</div>
              </div>
            </div>
            <div className="divide-y hair">
              {RFM_SEGMENTS.map((s, i) => {
                const a = actions[s.id];
                return (
                  <div key={s.id} className="py-4 grid grid-cols-[20px_10px_1fr] items-start gap-4">
                    <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="w-1.5 h-1.5 shrink-0 mt-1.5" style={{ background: s.hue }} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="t-bodyhi text-ink">{s.name}</span>
                        <span className="t-caption text-mute">{a.title}</span>
                      </div>
                      <p className="t-body text-mute mt-1.5">{a.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Cross-link ───────────────────────────────────────────────── */}
        <div className="t-body text-mute">
          Les segments ici alimentent la <button onClick={() => go('app/simulator')} className="underline underline-offset-2 decoration-line text-ink hover:text-accent">projection 12 mois du Simulator</button>.
          Ajustez d'abord la composition, puis allouez votre budget paid dans le <button onClick={() => go('app/mmm')} className="underline underline-offset-2 decoration-line text-ink hover:text-accent">MMM</button>.
        </div>

      </div>
    </PageShell>
  );
}

// ── Retention curve mini-chart ─────────────────────────────────
function RetentionCurveChart({ curve }) {
  const W = 600, H = 180, padL = 36, padR = 12, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xAt = (m) => padL + (m / (curve.length - 1)) * innerW;
  const yAt = (p) => padT + innerH - p * innerH;

  const path = curve.map((c, i) => `${i === 0 ? 'M' : 'L'} ${xAt(c.m).toFixed(1)} ${yAt(c.pct).toFixed(1)}`).join(' ');
  const area = `${path} L ${xAt(curve.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <MeasuredWidth className="h-[200px]">
      {(width) => (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 200 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="rfmRetGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)}
                    stroke="rgba(19,16,34,0.08)" strokeWidth="0.6" strokeDasharray={i === 0 ? '' : '2 3'} />
              <text x={padL - 4} y={yAt(t) + 3} textAnchor="end" fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          <path d={area} fill="url(#rfmRetGrad)" />
          <path d={path} stroke="#8D0AF5" strokeWidth="1.4" fill="none" />
          {curve.map((c, i) => (i % 3 === 0 || i === curve.length - 1) && (
            <text key={i} x={xAt(c.m)} y={H - padB + 14} textAnchor="middle"
                  fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
              M{c.m}
            </text>
          ))}
          <circle cx={xAt(curve.length - 1)} cy={yAt(curve[curve.length - 1].pct)} r="2.5"
                  fill="#8D0AF5" stroke="#fafafd" strokeWidth="1.2" />
        </svg>
      )}
    </MeasuredWidth>
  );
}

Object.assign(window, { RFMScreen });

// ── Data source · CRM connectors + CSV upload (flat layout) ────────────
function RFMDataSource() {
  const { toast } = useToast();
  const [status, setStatus] = useState('demo');
  const [source, setSource] = useState(null);
  const fileRef = useRef(null);

  const connectors = [
    { id: 'hubspot',    name: 'HubSpot',     pitch: 'Contacts · Deals',                color: '#FF7A59' },
    { id: 'salesforce', name: 'Salesforce',  pitch: 'Accounts · Opportunities',        color: '#00A1E0' },
    { id: 'attio',      name: 'Attio',       pitch: 'Records · Lists',                 color: '#4318FF' },
  ];

  const handleConnect = (id) => {
    setStatus('connecting');
    setSource(id);
    setTimeout(() => {
      setStatus('connected');
      toast(`${connectors.find(c => c.id === id).name} connecté · synchronisation des contacts…`, { tone: 'accent' });
    }, 1100);
  };

  const handleCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('csv');
    setSource(file.name);
    toast(`Fichier importé · ${file.name} · ${(file.size / 1024).toFixed(0)} kB`, { tone: 'accent' });
  };

  const reset = () => { setStatus('demo'); setSource(null); };

  return (
    <div className="pb-12 mb-12 border-b hair">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
        <div>
          <div className="t-bodyhi text-ink">Source des données</div>
          <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
            {status === 'demo'      && 'Données dérivées de votre profil. Connectez votre CRM ou importez un CSV pour un RFM live.'}
            {status === 'connecting'&& <>Connexion à <span className="text-ink">{connectors.find(c => c.id === source)?.name}</span>…</>}
            {status === 'connected' && <>Live · <span className="text-ink">{connectors.find(c => c.id === source)?.name}</span> · sync toutes les 24h.</>}
            {status === 'csv'       && <>Import CSV · <span className="text-ink">{source}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="t-caption inline-flex items-center gap-1.5 text-mute">
            <span className={cn('w-1.5 h-1.5 rounded-full',
                                status === 'connecting' ? 'bg-warn animate-pulse' :
                                status === 'demo' ? 'bg-mute' :
                                'bg-accent')} />
            {status === 'demo' ? 'Démo' : status === 'connecting' ? 'Connexion…' : status === 'connected' ? 'Live' : 'CSV'}
          </span>
          {status !== 'demo' && (
            <button onClick={reset} className="t-caption text-mute hover:text-ink underline underline-offset-2 decoration-line">
              Déconnecter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
        {connectors.map(c => {
          const isActive = status === 'connected' && source === c.id;
          const isConnecting = status === 'connecting' && source === c.id;
          return (
            <button key={c.id} type="button"
                    disabled={status === 'connecting'}
                    onClick={() => handleConnect(c.id)}
                    className={cn('text-left py-3 group transition-colors',
                                  status === 'connecting' && !isConnecting && 'opacity-40')}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-7 h-7 inline-flex items-center justify-center text-[12px] font-medium text-paper"
                     style={{ background: c.color }}>
                  {c.name[0]}
                </div>
                {isActive
                  ? <span className="t-caption text-ok">Connecté</span>
                  : isConnecting
                    ? <Spinner size={11} />
                    : <span className="t-caption text-mute group-hover:text-accent">Connecter →</span>}
              </div>
              <div className="t-body text-ink">{c.name}</div>
              <div className="t-caption text-mute mt-1">{c.pitch}</div>
            </button>
          );
        })}

        <button type="button"
                onClick={() => fileRef.current?.click()}
                disabled={status === 'connecting'}
                className={cn('text-left py-3 group transition-colors',
                              status === 'connecting' && 'opacity-40')}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-7 h-7 inline-flex items-center justify-center border hair">
              <IconUpload size={12} />
            </div>
            {status === 'csv'
              ? <span className="t-caption text-ok">Importé</span>
              : <span className="t-caption text-mute group-hover:text-accent">Parcourir →</span>}
          </div>
          <div className="t-body text-ink">CSV upload</div>
          <div className="t-caption text-mute mt-1">Email · date · # achats · montant</div>
          <input ref={fileRef} type="file" accept=".csv,.tsv" onChange={handleCsv} className="hidden" />
        </button>
      </div>
    </div>
  );
}
