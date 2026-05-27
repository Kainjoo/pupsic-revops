// Media Plan: 12-month grid (channels × months)
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function MediaPlanScreen({ user, plan, mediaPlan, setMediaPlan, mmmSpend, go }) {
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

  // Ensure structure
  const plan12 = useMemo(() => {
    return CHANNELS.reduce((acc, c) => {
      const row = mediaPlan[c.id];
      acc[c.id] = Array.isArray(row) && row.length === 12 ? row.slice() : Array.from({ length: 12 }, () => Math.round(mmmSpend[c.id] || 0));
      return acc;
    }, {});
  }, [mediaPlan, mmmSpend]);

  const update = (cid, m, val) => {
    setMediaPlan(prev => {
      const next = { ...prev };
      const row = (next[cid] || Array(12).fill(0)).slice();
      row[m] = Math.max(0, Math.round(val || 0));
      next[cid] = row;
      return next;
    });
  };

  const importFromMMM = () => {
    const next = CHANNELS.reduce((acc, c) => {
      acc[c.id] = Array.from({ length: 12 }, () => Math.round(mmmSpend[c.id] || 0));
      return acc;
    }, {});
    setMediaPlan(next);
    toast('Allocation MMM copiée sur 12 mois', { tone: 'accent' });
  };

  const rowTotals = CHANNELS.map(c => (plan12[c.id] || []).reduce((s, v) => s + v, 0));
  const monthTotals = Array.from({ length: 12 }, (_, m) =>
    CHANNELS.reduce((s, c) => s + (plan12[c.id]?.[m] || 0), 0)
  );
  const grandTotal = rowTotals.reduce((s, v) => s + v, 0);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/media-plan" go={go} logout={() => go('login')}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 lg:py-10">

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
          <div>
            <Badge tone="line" className="mono mb-3">MEDIA PLAN · GROWTH+</Badge>
            <h1 className="display text-[36px] lg:text-[44px] font-bold tracking-[-0.025em] leading-[1.02]">
              Plan média 12 mois.
            </h1>
            <p className="text-[14px] text-mute mt-2 max-w-[640px]">
              Chaque case éditable. Totaux par canal et par mois calculés en continu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="md" icon={<IconDownload size={13}/>} onClick={importFromMMM}>
              Importer du MMM
            </Button>
            <Button variant="primary" size="md" icon={<IconDownload size={13}/>}
                    onClick={() => toast('Exporté · plan-media-2026.csv', { tone: 'accent' })}>
              Exporter CSV
            </Button>
          </div>
        </div>

        <Card padded={false} className="overflow-hidden">
          {/* Grand summary strip */}
          <div className="px-5 py-4 border-b hair grid grid-cols-3 gap-6 items-end">
            <div>
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Total annuel</div>
              <div className="display text-[28px] font-semibold tracking-[-0.025em] num leading-none mt-2">
                <AnimNum value={grandTotal} format={fmtCHF} />
              </div>
            </div>
            <div>
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Moyenne / mois</div>
              <div className="display text-[20px] font-semibold tracking-tight num leading-none mt-2">
                <AnimNum value={grandTotal / 12} format={fmtCHF} />
              </div>
            </div>
            <div>
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Canaux actifs</div>
              <div className="display text-[20px] font-semibold tracking-tight num leading-none mt-2">
                {CHANNELS.filter(c => rowTotals[CHANNELS.indexOf(c)] > 0).length} / {CHANNELS.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto nice-scroll">
            <table className="w-full text-[12.5px] min-w-[1000px]">
              <thead>
                <tr className="border-b hair bg-paper">
                  <th className="sticky left-0 bg-paper px-4 py-3 text-left font-medium text-mute mono text-[10.5px] uppercase tracking-[0.04em] z-10 w-[200px]">Canal</th>
                  {MONTHS_FR.map((m, i) => (
                    <th key={m} className="px-2 py-3 text-right font-medium text-mute mono text-[10.5px] uppercase tracking-[0.04em] min-w-[78px]">
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-ink mono text-[10.5px] uppercase tracking-[0.04em] bg-paper2 min-w-[90px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((c, rowIdx) => (
                  <tr key={c.id} className="border-b hair">
                    <td className="sticky left-0 bg-paper px-4 py-2 z-10 w-[200px]">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{background:c.hue}} />
                        <span className="tracking-tight">{c.name}</span>
                      </span>
                    </td>
                    {Array.from({ length: 12 }, (_, m) => (
                      <td key={m} className="px-1 py-1 text-right">
                        <input
                          type="number"
                          value={plan12[c.id]?.[m] || 0}
                          onChange={e => update(c.id, m, Number(e.target.value))}
                          className="w-full h-9 text-right text-[12px] num bg-transparent px-2 hover:bg-paper2 focus:bg-paper2 focus:outline focus:outline-1 focus:outline-ink/40"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right bg-paper2 num font-semibold">
                      {fmtCHF(rowTotals[rowIdx])}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-paper2">
                  <td className="sticky left-0 bg-paper2 px-4 py-3 font-semibold tracking-tight z-10">Total / mois</td>
                  {monthTotals.map((t, m) => (
                    <td key={m} className="px-2 py-3 text-right num font-medium">{fmtCHFShort(t)}</td>
                  ))}
                  <td className="px-3 py-3 text-right num display text-[15px] font-semibold">{fmtCHF(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="text-[11px] text-mute mono uppercase mt-4">
          Astuce · "Importer du MMM" écrase le plan actuel avec l'allocation mensuelle du MMM, dupliquée sur 12 mois.
          Ajustez ensuite la saisonnalité au cas par cas.
        </div>
      </div>
    </PageShell>
  );
}

Object.assign(window, { MediaPlanScreen });
