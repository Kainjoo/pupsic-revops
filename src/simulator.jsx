// Revenue Simulator
// Combines: channel budget (from MMM) × market mix × RFM segmentation × retention
// → 12-month top-line revenue projection broken down by source.

function SimulatorScreen({ user, plan, profile, scenarios, mmmSpend, setMMMSpend, go }) {
  // Pull a panier from the most recent scenario, else industry default
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const panier = scenarios?.[0]?.inputs?.panier ?? ind.panier ?? 1850;
  const arpuMonthly = ind.arpuMonthly ?? (panier / 12);
  const roasTarget = getBlendedRoasTarget(profile?.industry, profile?.lifecycle);

  // Derived starting base (same model as Brand Planner): ~70% of CA from existing
  // customers, divided by blended annual ARPU (0.85 RFM weighting).
  const derivedStarting = useMemo(() => {
    if (profile?.caAnnuel && arpuMonthly > 0) {
      const blendedYearlyArpu = arpuMonthly * 12 * 0.85;
      return clamp(Math.round((profile.caAnnuel * 0.70) / blendedYearlyArpu), 30, 50000);
    }
    return profile?.salesTeam ? profile.salesTeam * 30 : 200;
  }, [profile?.caAnnuel, profile?.salesTeam, arpuMonthly]);

  // Simulator-only state (not persisted to profile/server)
  const [marketMix, setMarketMix] = useState({ vaud: 0.45, switzerland: 0.45, others: 0.10 });
  const [rfmShares, setRfmShares] = useState(
    RFM_SEGMENTS.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {})
  );
  const [retentionLift, setRetentionLift] = useState(1.0);
  const [newCustomerLift, setNewCustomerLift] = useState(1.0);
  const [startingCustomers, setStartingCustomers] = useState(derivedStarting);

  // Keep starting base in sync with profile CA unless the user has explicitly tweaked it
  const startingTouched = useRef(false);
  useEffect(() => {
    if (!startingTouched.current) setStartingCustomers(derivedStarting);
  }, [derivedStarting]);

  // Normalised mix for charts (avoid divide-by-zero)
  const normMix = useMemo(() => {
    const sum = Object.values(marketMix).reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(Object.entries(marketMix).map(([k, v]) => [k, v / sum]));
  }, [marketMix]);

  const normRfm = useMemo(() => {
    const sum = Object.values(rfmShares).reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(Object.entries(rfmShares).map(([k, v]) => [k, v / sum]));
  }, [rfmShares]);

  const sim = useMemo(() => simulateTopLine({
    spendByChannel: mmmSpend,
    marketMix: normMix,
    rfmShares: normRfm,
    panier,
    arpuMonthly,
    startingCustomers,
    retentionLift,
    newCustomerLift,
    horizonMonths: 12,
  }), [mmmSpend, normMix, normRfm, panier, arpuMonthly, startingCustomers, retentionLift, newCustomerLift]);

  const totalBudgetMonthly = Object.values(mmmSpend).reduce((a, b) => a + (b || 0), 0);
  const paidAnnual = totalBudgetMonthly * 12;

  // Credibility: incremental ROAS = (totalRev − baseline) / paid spend
  const credibility = useMemo(() => {
    const blendedRFM = 0.85, avgRetention = 0.93;
    const baseline = startingCustomers * blendedRFM * arpuMonthly * 12 * avgRetention;
    const incrementalRev = Math.max(0, sim.totals.totalRev - baseline);
    const modeledRoas = paidAnnual > 0 ? incrementalRev / paidAnnual : 0;
    const delta = roasTarget > 0 ? (modeledRoas / roasTarget - 1) * 100 : 0;
    return { baseline, incrementalRev, modeledRoas, delta };
  }, [sim.totals.totalRev, startingCustomers, arpuMonthly, paidAnnual, roasTarget]);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/simulator" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        <ExpertHeader
          eyebrow="Simulator · projection 12 mois"
          title="Combien votre moteur va générer dans 12 mois."
          lead="Top-line projeté en fonction du mix actuel, du parc client RFM et des leviers RevOps. Pour le snapshot du mois en cours, ouvrez le Dashboard. Pour le P&L et la trésorerie, Financials."
          crossLinks={[
            { label: 'Dashboard · snapshot du mois',  onClick: () => go('app/dashboard') },
            { label: 'Ajuster le mix média (MMM)',     onClick: () => go('app/mmm') },
          ]}
        />

        {/* Outcome strip — primary forward-looking return */}
        <OutcomeStrip
          primary={{
            label: 'Top-line projeté · 12 mois',
            value: sim.totals.totalRev,
            format: fmtCHFShort,
            sub: <>Dont <span className="text-ink num">{fmtCHFShort(sim.totals.totalExistingRev)}</span> du parc existant · <span className="text-accent num">{fmtCHFShort(sim.totals.totalNewRev)}</span> de nouveaux clients acquis sur {fmtCHFShort(sim.totals.totalSpend)} de paid media.</>,
          }}
          kpis={[
            { label: 'ROAS incrémental',     value: credibility.modeledRoas,                  format: (v) => `${v.toFixed(2).replace('.', ',')}×`, sub: `Cible bench · ${roasTarget.toFixed(1).replace('.', ',')}× (${credibility.delta >= 0 ? '+' : ''}${credibility.delta.toFixed(0)}%)` },
            { label: 'Nouveaux clients',     value: Math.round(sim.totals.totalNewCustomers), format: fmtNum,                                       sub: `CAC moyen · ${fmtCHF(sim.totals.blendedCAC)}` },
            { label: 'Budget paid · 12 mois',value: sim.totals.totalSpend,                    format: fmtCHFShort,                                   sub: `${fmtCHF(totalBudgetMonthly)} / mois` },
            { label: 'Rétention RFM',        value: retentionLift,                            format: (v) => `×${v.toFixed(2).replace('.', ',')}`,  sub: 'Lift vs baseline' },
          ]}
        />

        {/* Attribution — where the forward revenue comes from */}
        <AttributionPanel
          title="D'où vient le revenu projeté · 12 mois"
          lead="Ventilation top-line par canal d'acquisition (nouveaux clients). Le parc existant est exclu pour isoler la contribution paid."
          items={sim.totals.channelTotals.map(c => ({ id: c.id, label: c.name, hue: c.hue, value: c.revenue }))}
          total={sim.totals.totalNewRev}
          format={fmtCHFShort}
        />

        {/* Action — concrete next step */}
        {(() => {
          const topCh = sim.totals.channelTotals.slice().sort((a, b) => b.revenue - a.revenue)[0];
          const within = Math.abs(credibility.delta) <= 25;
          if (!within && credibility.delta < 0) {
            return (
              <ActionCard
                title={<>ROAS modélisé <span className="num">{credibility.modeledRoas.toFixed(1).replace('.', ',')}×</span> vs cible <span className="num">{roasTarget.toFixed(1).replace('.', ',')}×</span> — votre mix sous-performe.</>}
                copy="Réallouez vers les canaux à fort ROAS marginal dans le MMM. L'optimisation automatique converge en quelques secondes."
                primary={{ label: 'Ouvrir le MMM', onClick: () => go('app/mmm') }}
                secondary={{ label: 'Revoir la base RFM', onClick: () => go('app/rfm') }}
              />
            );
          }
          if (topCh && topCh.revenue / sim.totals.totalNewRev > 0.45) {
            return (
              <ActionCard
                title={<><span className="num">{fmtPct(topCh.revenue / sim.totals.totalNewRev, 0)}</span> du revenu projeté vient de <span className="text-accent">{topCh.name}</span> — concentration élevée.</>}
                copy="Une dépendance > 45% à un canal expose à un risque de saturation ou d'algorithme. Diversifiez via Media Plan."
                primary={{ label: 'Ouvrir Media Plan', onClick: () => go('app/media-plan') }}
                secondary={{ label: 'Ajuster le MMM', onClick: () => go('app/mmm') }}
              />
            );
          }
          return null;
        })()}

        {/* ── Trajectory chart ─────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Trajectoire 12 mois</div>
              <div className="t-caption text-mute mt-1">CHF / mois · parc existant + nouveaux clients</div>
            </div>
          </div>
          <SimulatorChart months={sim.months} />
        </div>

        {/* ── Controls + Breakdowns ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 pb-12 mb-12 border-b hair">

          {/* Controls column */}
          <div className="space-y-10 lg:sticky lg:top-[80px] self-start">

            {/* Market mix */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Mix géographique</div>
                  <div className="t-caption text-mute mt-1">Répartition du budget par marché</div>
                </div>
                <div className={cn('t-caption tabular-nums',
                  Math.abs(Object.values(marketMix).reduce((a, b) => a + b, 0) - 1) > 0.01 ? 'text-warn' : 'text-ok')}>
                  {(Object.values(marketMix).reduce((a, b) => a + b, 0) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="space-y-4">
                {MARKET_ORDER.map(id => {
                  const mk = MARKETS[id];
                  return (
                    <div key={id}>
                      <FieldSlider
                        label={<span>{mk.flag} {mk.name}</span>}
                        value={marketMix[id] * 100}
                        min={0} max={100} step={1}
                        format={(v) => `${v.toFixed(0)}%`}
                        accent={id === 'switzerland'}
                        onChange={(v) => setMarketMix(prev => ({ ...prev, [id]: v / 100 }))} />
                      <div className="t-caption text-mute mt-1 normal-case tracking-normal leading-relaxed"
                           style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                        CAC ×{mk.cacMultiplier.toFixed(2).replace('.', ',')} ·
                        Rétention ×{mk.retentionAdj.toFixed(2).replace('.', ',')} ·
                        TAM {fmtCHFShort(mk.addressableCHF)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RFM mix */}
            <div>
              <div className="flex items-baseline justify-between mb-5 gap-3">
                <div>
                  <div className="t-bodyhi text-ink">Mix RFM · parc existant</div>
                  <div className="t-caption text-mute mt-1">Recency / Frequency / Monetary</div>
                </div>
                <Input value={startingCustomers} type="number"
                       onChange={(e) => { startingTouched.current = true; setStartingCustomers(Math.max(0, Number(e.target.value) || 0)); }}
                       className="w-[110px]" suffix="clients" />
              </div>
              <div className="space-y-4">
                {RFM_SEGMENTS.map(s => (
                  <div key={s.id}>
                    <FieldSlider
                      label={
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 inline-block" style={{ background: s.hue }} />
                          {s.name}
                        </span>
                      }
                      value={rfmShares[s.id] * 100}
                      min={0} max={100} step={1}
                      format={(v) => `${v.toFixed(0)}%`}
                      onChange={(v) => setRfmShares(prev => ({ ...prev, [s.id]: v / 100 }))} />
                    <div className="t-caption text-mute mt-1 normal-case tracking-normal leading-relaxed"
                         style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                      {s.hint} · valeur ×{s.monthlyValueMult.toFixed(2).replace('.', ',')} · rétention {fmtPct(s.retentionMonthly, 0)}/mois
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RevOps levers */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Leviers RevOps</div>
                  <div className="t-caption text-mute mt-1">Effet de l'optimisation sur les flux</div>
                </div>
              </div>
              <div className="space-y-4">
                <FieldSlider label="Lift rétention (vs baseline)"
                  value={retentionLift} min={0.85} max={1.20} step={0.01}
                  format={(v) => `×${v.toFixed(2).replace('.', ',')}`}
                  benchmark={1.0} benchmarkLabel="Baseline"
                  hint="Effet du programme RevOps sur la rétention par segment."
                  accent
                  onChange={setRetentionLift} />
                <FieldSlider label="Lift acquisition (efficacité canal)"
                  value={newCustomerLift} min={0.70} max={1.50} step={0.01}
                  format={(v) => `×${v.toFixed(2).replace('.', ',')}`}
                  benchmark={1.0} benchmarkLabel="Baseline"
                  hint="Effet RevOps sur la conversion canal → client (CRM, scoring, SLA)."
                  onChange={setNewCustomerLift} />
              </div>
            </div>
          </div>

          {/* Breakdowns column */}
          <div className="space-y-10 min-w-0">

            {/* Per-market */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Top-line par marché</div>
                  <div className="t-caption text-mute mt-1">12 mois · cumulé</div>
                </div>
              </div>
              <div className="divide-y hair">
                {sim.totals.marketTotals.map((m, i) => {
                  const mk = MARKETS[m.id];
                  const pct = sim.totals.totalNewRev > 0 ? m.revenue / sim.totals.totalNewRev : 0;
                  return (
                    <div key={m.id} className="py-3 grid grid-cols-[20px_24px_1fr_160px_110px] gap-4 items-center">
                      <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="text-[16px]">{mk.flag}</div>
                      <div className="min-w-0">
                        <div className="t-body text-ink truncate">{mk.name}</div>
                        <div className="t-caption text-mute mt-1">{fmtNum(Math.round(m.customers))} clients</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-[3px] bg-line2 relative overflow-hidden flex-1">
                          <div className="h-full bg-accent"
                               style={{ width: `${pct * 100}%`, transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                        <span className="t-caption text-mute tabular-nums shrink-0">{fmtPct(pct, 0)}</span>
                      </div>
                      <div className="text-right">
                        <div className="t-body text-ink num tabular-nums">
                          <AnimNum value={m.revenue} format={fmtCHFShort} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-channel */}
            <div>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="t-bodyhi text-ink">Top-line par canal</div>
                  <div className="t-caption text-mute mt-1">12 mois · cumulé</div>
                </div>
              </div>
              <div className="divide-y hair">
                {sim.totals.channelTotals
                  .slice().sort((a, b) => b.revenue - a.revenue)
                  .map((c, i) => {
                    const pct = sim.totals.totalNewRev > 0 ? c.revenue / sim.totals.totalNewRev : 0;
                    const monthlySpend = mmmSpend[c.id] || 0;
                    return (
                      <div key={c.id} className="py-3 grid grid-cols-[20px_10px_1fr_180px_140px] gap-4 items-center">
                        <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <span className="w-1.5 h-1.5" style={{ background: c.hue }} />
                        <div className="min-w-0">
                          <div className="t-body text-ink truncate">{c.name}</div>
                          <div className="t-caption text-mute mt-1">{fmtCHFShort(monthlySpend)} / mois</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-[3px] bg-line2 relative overflow-hidden flex-1">
                            <div className="h-full"
                                 style={{ width: `${pct * 100}%`, background: c.hue,
                                          transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                          </div>
                          <span className="t-caption text-mute tabular-nums shrink-0">{fmtPct(pct, 0)}</span>
                        </div>
                        <div className="text-right">
                          <div className="t-num text-ink num tabular-nums">
                            {fmtCHFShort(c.revenue)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageShell>
  );
}

// ─── 12-month stacked-area chart (SVG, hand-rolled) ──────────────────────
function SimulatorChart({ months }) {
  const W = 800, H = 240, padL = 56, padR = 16, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = months.length;
  const yMax = Math.max(...months.map(m => m.totalRev)) * 1.08 || 1;
  const xAt = (i) => padL + (i / (N - 1)) * innerW;
  const yAt = (v) => padT + innerH - (v / yMax) * innerH;

  // Existing (bottom layer)
  const existingPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(m.existingRev).toFixed(1)}`).join(' ');
  const existingArea = `${existingPath} L ${xAt(N - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // Total (top of new layer)
  const totalPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(m.totalRev).toFixed(1)}`).join(' ');
  // New layer = area between total and existing
  const newArea = `${totalPath} ${months.slice().reverse().map((m, i) => {
    const realI = N - 1 - i;
    return `L ${xAt(realI).toFixed(1)} ${yAt(m.existingRev).toFixed(1)}`;
  }).join(' ')} Z`;

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => yMax * t);

  return (
    <MeasuredWidth className="h-[260px]">
      {(width) => {
        const scale = width / W;
        return (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 260 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="simExistingGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#131022" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#131022" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="simNewGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Y grid + labels */}
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
                      stroke="rgba(19,16,34,0.10)" strokeWidth="0.8" strokeDasharray={i === 0 ? '' : '2 3'} />
                <text x={padL - 6} y={yAt(v) + 3} textAnchor="end"
                      fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif">
                  {fmtCHFShort(v)}
                </text>
              </g>
            ))}

            {/* Existing area */}
            <path d={existingArea} fill="url(#simExistingGrad)" />
            <path d={existingPath} stroke="#131022" strokeOpacity="0.55" strokeWidth="1.2" fill="none" />

            {/* New area on top */}
            <path d={newArea} fill="url(#simNewGrad)" />
            <path d={totalPath} stroke="#8D0AF5" strokeWidth="1.8" fill="none" />

            {/* X labels */}
            {months.map((m, i) => (
              (i % 2 === 0 || i === N - 1) && (
                <text key={i} x={xAt(i)} y={H - padB + 14} textAnchor="middle"
                      fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif" letterSpacing="0.06em">
                  {m.label}
                </text>
              )
            ))}

            {/* End-point dots */}
            <circle cx={xAt(N - 1)} cy={yAt(months[N - 1].existingRev)} r="2.5"
                    fill="#131022" stroke="#fafafd" strokeWidth="1" />
            <circle cx={xAt(N - 1)} cy={yAt(months[N - 1].totalRev)} r="3.2"
                    fill="#8D0AF5" stroke="#fafafd" strokeWidth="1.2" />
          </svg>
        );
      }}
    </MeasuredWidth>
  );
}

Object.assign(window, { SimulatorScreen });
