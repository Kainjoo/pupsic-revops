// Media Plan: quarterly grid (channels × quarters), audience-filtered.
// Channels not relevant to the audience are hidden (e.g. no Meta/TikTok for B2B).
// Quarterly view = 4 columns instead of 12 monthly cells → easier to plan budget
// allocations at the strategic level.
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_LABELS = ['Q1 · Jan-Mar', 'Q2 · Avr-Juin', 'Q3 · Juil-Sep', 'Q4 · Oct-Déc'];
const QUARTER_MONTHS = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]];

// Map industry → default audience (mirrors brand-planner.inferAudience)
const INDUSTRY_AUDIENCE = {
  saas_b2b: 'b2b',     services: 'b2b', industrial: 'b2b',
  ecom: 'b2c',         finsvc: 'b2b2c', health: 'b2b2c',
};

function MediaPlanScreen({ user, plan, profile, mediaPlan, setMediaPlan, mmmSpend, go }) {
  const { toast } = useToast();

  if (!planAllows(plan, 'growth')) {
    return (
      <PageShell user={user} plan={plan} currentScreen="app/media-plan" go={go} logout={() => go('login')}>
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10">
          <GatedPanel need="growth" plan={plan} onUpgrade={() => go('pricing')}
            title="Media Plan Builder"
            copy="Planifiez 12 mois d'investissement par canal. Disponible sur Growth et Pro." />
        </div>
      </PageShell>
    );
  }

  // Audience derived from industry, user-overridable inline
  const inferredAudience = INDUSTRY_AUDIENCE[profile?.industry] || 'b2b2c';
  const [audience, setAudience] = useState(inferredAudience);
  const visibleChannels = useMemo(() => channelsForAudience(audience), [audience]);

  // Quarterly plan structure: { [channelId]: [Q1, Q2, Q3, Q4] }
  // Initialize from existing monthly mediaPlan (aggregate months → quarters)
  // or from mmmSpend (monthly average × 3 = quarterly).
  const plan4 = useMemo(() => {
    return CHANNELS.reduce((acc, c) => {
      const monthly = mediaPlan[c.id];
      if (Array.isArray(monthly) && monthly.length === 12 && monthly.some(v => v > 0)) {
        // Sum months per quarter
        acc[c.id] = QUARTER_MONTHS.map(months => months.reduce((s, m) => s + (monthly[m] || 0), 0));
      } else if (Array.isArray(monthly) && monthly.length === 4) {
        acc[c.id] = monthly.slice();
      } else {
        // Default: 3× monthly MMM spend per quarter
        const base = Math.round((mmmSpend[c.id] || 0) * 3);
        acc[c.id] = [base, base, base, base];
      }
      return acc;
    }, {});
  }, [mediaPlan, mmmSpend]);

  const update = (cid, q, val) => {
    setMediaPlan(prev => {
      const next = { ...prev };
      const row = next[cid] && next[cid].length === 4 ? next[cid].slice()
                : plan4[cid].slice();
      row[q] = Math.max(0, Math.round(val || 0));
      next[cid] = row;
      return next;
    });
  };

  const importFromMMM = () => {
    const next = CHANNELS.reduce((acc, c) => {
      const base = Math.round((mmmSpend[c.id] || 0) * 3);
      acc[c.id] = [base, base, base, base];
      return acc;
    }, {});
    setMediaPlan(next);
    toast('Allocation MMM répartie sur 4 trimestres', { tone: 'accent' });
  };

  // Quarterly seasonality presets (multiplicative weights, mean = 1)
  const SEASONALITY = {
    flat:   { label: 'Plat',       weights: [1.00, 1.00, 1.00, 1.00] },
    q4push: { label: 'Push Q4',    weights: [0.85, 0.85, 0.95, 1.35] },
    summer: { label: 'Creux été',  weights: [1.10, 1.05, 0.70, 1.15] },
    h1bond: { label: 'Bond H1',    weights: [1.10, 1.25, 0.85, 0.80] },
  };
  const applySeasonality = (key) => {
    const w = SEASONALITY[key].weights;
    setMediaPlan(prev => {
      const next = {};
      for (const c of CHANNELS) {
        const row = (prev[c.id] && prev[c.id].length === 4) ? prev[c.id]
                  : plan4[c.id] || [0,0,0,0];
        const avg = row.reduce((a, b) => a + b, 0) / 4;
        next[c.id] = row.map((_, q) => Math.max(0, Math.round(avg * w[q])));
      }
      return next;
    });
    toast(`Saisonnalité « ${SEASONALITY[key].label} » appliquée`, { tone: 'accent' });
  };

  // Totals — only visible channels count for summary
  const visibleIds = new Set(visibleChannels.map(c => c.id));
  const rowTotals = CHANNELS.map(c => visibleIds.has(c.id) ? (plan4[c.id] || []).reduce((s, v) => s + v, 0) : 0);
  const quarterTotals = QUARTERS.map((_, q) =>
    visibleChannels.reduce((s, c) => s + (plan4[c.id]?.[q] || 0), 0)
  );
  const grandTotal = rowTotals.reduce((s, v) => s + v, 0);

  // Per-channel ROAS + conversions (annual)
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const panier = ind.panier;
  const channelStats = CHANNELS.map((c, i) => {
    if (!visibleIds.has(c.id)) return { roas: 0, conversions: 0, annualRev: 0 };
    const annual = rowTotals[i];
    const avgMonthly = annual / 12;
    const monthlyRev = channelRevenue(c, avgMonthly);
    const annualRev  = monthlyRev * 12;
    const roas = annual > 0 ? annualRev / annual : 0;
    const conversions = panier > 0 ? Math.round(annualRev / panier) : 0;
    return { roas, conversions, annualRev };
  });
  const totalAnnualRev   = channelStats.reduce((a, b) => a + b.annualRev, 0);
  const totalConversions = channelStats.reduce((a, b) => a + b.conversions, 0);
  const totalRoas        = grandTotal > 0 ? totalAnnualRev / grandTotal : 0;

  const audienceMeta = {
    b2b:   { label: 'B2B',   pitch: 'Décideurs entreprise · pas de canaux grand public' },
    b2b2c: { label: 'B2B2C', pitch: 'Hybride · tous les canaux pertinents' },
    b2c:   { label: 'B2C',   pitch: 'Consommateurs · pas de LinkedIn' },
  };
  const hiddenCount = CHANNELS.length - visibleChannels.length;

  return (
    <PageShell user={user} plan={plan} currentScreen="app/media-plan" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        <ExpertHeader
          eyebrow={`Media Plan · trimestriel · ${audienceMeta[audience].label}`}
          title="Plan média trimestriel, aligné sur votre audience."
          lead="Quatre trimestres, canaux filtrés selon votre cible. Modifiez les enveloppes par Q et la saisonnalité s'ajuste. Les ROAS et conversions sont projetés via les courbes MMM."
          crossLinks={[
            { label: 'MMM · optimiser le mix',           onClick: () => go('app/mmm') },
            { label: 'Simulator · projeter le top-line', onClick: () => go('app/simulator') },
          ]}
        />

        {/* ── Outcome strip ────────────────────────────────────────────── */}
        <OutcomeStrip
          primary={{
            label: 'Budget total · 12 mois',
            value: grandTotal,
            format: fmtCHFShort,
            sub: <>Revenu projeté <span className="text-accent num">{fmtCHFShort(totalAnnualRev)}</span> · ROAS <span className="num">{totalRoas.toFixed(2).replace('.', ',')}×</span> · {fmtNum(totalConversions)} conversions / an.</>,
          }}
          kpis={[
            { label: 'Moyenne / trimestre',  value: grandTotal / 4,    format: fmtCHFShort,                                   sub: `${visibleChannels.length} canaux actifs` },
            { label: 'Revenu projeté',       value: totalAnnualRev,    format: fmtCHFShort,                                   sub: 'cumulé sur 12 mois' },
            { label: 'ROAS pondéré',         value: totalRoas,         format: (v) => v.toFixed(2).replace('.', ',') + '×',   sub: 'top-line / budget' },
            { label: 'Conversions / an',     value: totalConversions,  format: fmtNum,                                        sub: `panier moyen ${fmtCHFShort(panier)}` },
          ]}
        />

        {/* ── Audience filter + actions ────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="t-bodyhi text-ink">Audience cible</div>
              <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
                {audienceMeta[audience].pitch}
                {hiddenCount > 0 && (
                  <span className="ml-2 text-warn">
                    · {hiddenCount} canal{hiddenCount > 1 ? 'aux' : ''} masqué{hiddenCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={<IconDownload size={13}/>} onClick={importFromMMM}>
                Importer du MMM
              </Button>
              <Button variant="primary" size="sm" icon={<IconDownload size={13}/>}
                      onClick={() => toast('Exporté · plan-media-2026.csv', { tone: 'accent' })}>
                Exporter CSV
              </Button>
            </div>
          </div>

          <div className="inline-flex border hair">
            {['b2b','b2b2c','b2c'].map((a, i) => (
              <button key={a} type="button" onClick={() => setAudience(a)}
                      className={cn('px-4 h-9 t-body tracking-tight transition-colors',
                                    i > 0 && 'border-l hair',
                                    audience === a ? 'bg-ink text-paper' : 'text-mute hover:text-ink hover:bg-paper2')}>
                {audienceMeta[a].label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Seasonality presets ──────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="t-bodyhi text-ink">Saisonnalité trimestrielle</div>
              <div className="t-caption text-mute mt-1">Distribuez le budget selon votre courbe d'achat</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(SEASONALITY).map(([k, v]) => (
                <button key={k} type="button" onClick={() => applySeasonality(k)}
                        className="px-3 h-8 t-body text-ink tracking-tight border hair hover:border-ink hover:bg-paper2 transition-colors">
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Plan grid ────────────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Allocation par trimestre</div>
              <div className="t-caption text-mute mt-1">CHF · {visibleChannels.length} canaux pour audience {audienceMeta[audience].label}</div>
            </div>
            <div className="t-num text-accent tabular-nums">
              <AnimNum value={grandTotal} format={fmtCHFShort} />
            </div>
          </div>

          <div className="overflow-x-auto nice-scroll border-t hair">
            <table className="w-full">
              <thead>
                <tr className="border-b hair">
                  <th className="sticky left-0 bg-paper px-4 py-3 text-left t-caption text-mute z-10 w-[220px]">Canal</th>
                  {QUARTER_LABELS.map((q) => (
                    <th key={q} className="px-3 py-3 text-right t-caption text-mute min-w-[150px]">
                      {q}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right t-caption text-ink min-w-[110px]">Total / an</th>
                  <th className="px-3 py-3 text-right t-caption text-mute min-w-[80px]">ROAS</th>
                  <th className="px-3 py-3 text-right t-caption text-mute min-w-[90px]">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {visibleChannels.map(c => {
                  const rowIdx = CHANNELS.indexOf(c);
                  return (
                    <tr key={c.id} className="border-b hair">
                      <td className="sticky left-0 bg-paper px-4 py-3 z-10 w-[220px]">
                        <span className="inline-flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5" style={{background:c.hue}} />
                          <span className="t-body text-ink">{c.name}</span>
                        </span>
                      </td>
                      {QUARTERS.map((_, q) => (
                        <td key={q} className="px-2 py-1 text-right">
                          <input
                            type="number"
                            value={plan4[c.id]?.[q] || 0}
                            onChange={e => update(c.id, q, Number(e.target.value))}
                            className="w-full h-9 text-right t-body num bg-transparent px-2 hover:bg-paper2 focus:bg-paper2 focus:outline focus:outline-1 focus:outline-ink/40"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right t-body text-ink num tabular-nums">
                        {fmtCHFShort(rowTotals[rowIdx])}
                      </td>
                      <td className="px-3 py-3 text-right t-body num tabular-nums">
                        <span className={cn(
                          channelStats[rowIdx].roas > 4 ? 'text-ok' :
                          channelStats[rowIdx].roas > 2 ? 'text-ink' : 'text-bad')}>
                          {channelStats[rowIdx].roas.toFixed(1).replace('.', ',')}×
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right t-body text-mute num tabular-nums">
                        {fmtNum(channelStats[rowIdx].conversions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky left-0 bg-paper px-4 py-4 z-10 t-bodyhi text-ink">Total / trimestre</td>
                  {quarterTotals.map((t, q) => (
                    <td key={q} className="px-3 py-4 text-right t-body text-ink num tabular-nums">{fmtCHFShort(t)}</td>
                  ))}
                  <td className="px-3 py-4 text-right t-num text-accent num tabular-nums">{fmtCHFShort(grandTotal)}</td>
                  <td className="px-3 py-4 text-right t-body text-ink num tabular-nums">{totalRoas.toFixed(2).replace('.', ',')}×</td>
                  <td className="px-3 py-4 text-right t-body text-ink num tabular-nums">{fmtNum(totalConversions)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {hiddenCount > 0 && (
          <div className="t-body text-mute">
            <span className="t-caption text-mute mr-2">Canaux masqués</span>
            {CHANNELS.filter(c => !visibleIds.has(c.id)).map(c => c.name).join(' · ')}
            <span className="text-line"> — </span>
            non pertinents pour une audience <span className="text-ink">{audienceMeta[audience].label}</span>.
          </div>
        )}

      </div>
    </PageShell>
  );
}

Object.assign(window, { MediaPlanScreen });
