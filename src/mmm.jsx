// Marketing Mix Model screen
const RC = window.Recharts;

function ChannelRow({ channel, spend, util, marginal, onSpend, animating }) {
  const c = channel;
  // Status flags
  const isSaturated = util > 0.80;
  const isUnder = util < 0.30 && spend > 0;
  const tone = isSaturated ? 'bad' : isUnder ? 'ok' : 'neutral';

  // Tiny curve preview — 64 points
  const points = useMemo(() => {
    const pts = [];
    const maxS = c.sat * 4;
    for (let i = 0; i <= 32; i++) {
      const s = (maxS * i) / 32;
      pts.push({ s, r: channelRevenue(c, s) });
    }
    return pts;
  }, [c.id]);
  const youHere = { s: spend, r: channelRevenue(c, spend) };

  return (
    <div className={cn('px-5 py-4 grid grid-cols-[1fr_88px] gap-4 items-center transition-colors',
                        animating && 'bg-accentSoft/40')}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: c.hue }} />
            <span className="text-[13px] font-medium tracking-tight truncate">{c.name}</span>
            {isSaturated && <Badge tone="bad" className="mono">SATURÉ</Badge>}
            {isUnder && <Badge tone="ok" className="mono">SOUS-INVESTI</Badge>}
          </div>
          <div className="text-right">
            <div className="display text-[15px] font-semibold tracking-tight num"><AnimNum value={spend} format={fmtCHF} /></div>
          </div>
        </div>
        <input type="range" min={0} max={Math.round(c.sat * 3.5)} step={100}
               value={spend}
               onChange={(e) => onSpend(Number(e.target.value))}
               className={animating ? 'accent' : ''}
               style={{ accentColor: c.hue }} />
        <div className="flex items-center justify-between text-[11px] text-mute mono">
          <span>ROAS marginal&nbsp;<span className="text-ink">{marginal.toFixed(2).replace('.', ',')}×</span></span>
          <span>Utilisation ceiling&nbsp;<span className={cn(tone === 'bad' && 'text-bad', tone === 'ok' && 'text-ok', tone === 'neutral' && 'text-ink')}>{fmtPct(util, 0)}</span></span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="w-full h-14 -mt-1">
        <svg viewBox="0 0 100 56" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`g-${c.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.hue} stopOpacity="0.18" />
              <stop offset="100%" stopColor={c.hue} stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const xs = points.map((p, i) => (i / (points.length - 1)) * 100);
            const ys = points.map(p => 54 - (p.r / c.ceiling) * 50);
            const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(' ');
            const area = `${path} L 100 54 L 0 54 Z`;
            const hx = clamp((spend / (c.sat * 4)) * 100, 0, 100);
            const hy = 54 - (channelRevenue(c, spend) / c.ceiling) * 50;
            return (
              <>
                <path d={area} fill={`url(#g-${c.id})`} />
                <path d={path} stroke={c.hue} strokeWidth="1.4" fill="none" />
                <line x1={hx} x2={hx} y1="2" y2="54" stroke={c.hue} strokeOpacity="0.35" strokeDasharray="2 2" strokeWidth="1" />
                <circle cx={hx} cy={hy} r="3" fill={c.hue} stroke="#fafaf7" strokeWidth="1.5" />
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

function MMMScreen({ user, plan, mmmSpend, setMMMSpend, mediaPlan, setMediaPlan, go }) {
  const { toast } = useToast();

  if (!planAllows(plan, 'growth')) {
    return (
      <PageShell user={user} plan={plan} currentScreen="app/mmm" go={go} logout={() => go('login')}>
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10">
          <GatedPanel need="growth" plan={plan} onUpgrade={() => go('pricing')}
            title="Marketing Mix Model"
            copy="Modélisez vos 8 canaux marketing et optimisez l'allocation de votre budget en continu." />
        </div>
      </PageShell>
    );
  }

  const [optimizing, setOptimizing] = useState(false);
  const [animSet, setAnimSet] = useState(new Set());
  const [snapshot, setSnapshot] = useState(null);

  const setSpend = (id, val) => setMMMSpend(prev => ({ ...prev, [id]: val }));

  const mmm = useMemo(() => computeMMM(mmmSpend), [mmmSpend]);
  const suggestion = useMemo(() => suggestRealloc(mmmSpend), [mmmSpend]);

  // Stacked bar — single column with each channel stacked
  const stackedData = useMemo(() => [{
    name: 'Top-line',
    ...Object.fromEntries(mmm.perChannel.map(c => [c.id, c.revenue])),
    base: mmm.baseUplift,
  }], [mmm]);

  // Optimize: run reallocStep 10× (or until equilibrium), animate sliders.
  const optimize = () => {
    if (optimizing) return;
    setOptimizing(true);
    setSnapshot({ totalRevenue: mmm.totalRevenue, roas: mmm.roas, totalSpend: mmm.totalSpend });
    let current = { ...mmmSpend };
    let i = 0;
    const tick = () => {
      const step = reallocStep(current, 800);
      if (!step || i >= 18) {
        setOptimizing(false);
        setAnimSet(new Set());
        toast('Allocation optimisée', { tone: 'accent' });
        return;
      }
      current = step.next;
      setMMMSpend(current);
      setAnimSet(new Set([step.from, step.to]));
      i++;
      setTimeout(tick, 220);
    };
    setTimeout(tick, 200);
  };

  const importToMediaPlan = () => {
    const next = CHANNELS.reduce((acc, c) => {
      acc[c.id] = Array.from({ length: 12 }, () => Math.round(mmmSpend[c.id] || 0));
      return acc;
    }, {});
    setMediaPlan(next);
    toast('Plan média à 12 mois généré');
    go('app/media-plan');
  };

  return (
    <PageShell user={user} plan={plan} currentScreen="app/mmm" go={go} logout={() => go('login')}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 lg:py-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
          <div>
            <Badge tone="line" className="mono mb-3">MARKETING MIX MODEL · GROWTH+</Badge>
            <h1 className="display text-[36px] lg:text-[44px] font-bold tracking-[-0.025em] leading-[1.02]">
              Allouez votre budget comme un MMM.
            </h1>
            <p className="text-[14px] text-mute mt-2 max-w-[640px]">
              Réponse par canal modélisée en courbe de saturation. ROAS marginal calculé en continu — ajustez les curseurs ou laissez Pupsic optimiser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="md" icon={<IconUpload size={13}/>} onClick={importToMediaPlan}>
              Pousser vers media plan
            </Button>
            <Button variant="primary" size="md"
                    onClick={optimize}
                    disabled={optimizing}
                    icon={optimizing ? <Spinner size={14}/> : <IconWand size={14}/>}>
              {optimizing ? 'Optimisation…' : 'Optimiser automatiquement'}
            </Button>
          </div>
        </div>

        {/* Layout: channels (left) + outputs (right) */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3">

          {/* Channels panel */}
          <Card padded={false}>
            <div className="px-5 py-4 border-b hair flex items-center justify-between">
              <div className="display text-[15px] font-semibold tracking-tight">Canaux · dépense mensuelle</div>
              <div className="text-[11px] text-mute mono uppercase">{CHANNELS.length} actifs</div>
            </div>
            <div className="divide-y hair">
              {mmm.perChannel.map(c => (
                <ChannelRow key={c.id}
                            channel={c}
                            spend={c.spend}
                            util={c.util}
                            marginal={c.marginal}
                            animating={animSet.has(c.id)}
                            onSpend={(v) => setSpend(c.id, v)} />
              ))}
              <div className="px-5 py-4 bg-paper2 flex items-center justify-between">
                <span className="display text-[14px] font-semibold tracking-tight">Total dépense / mois</span>
                <span className="display text-[20px] font-semibold tracking-tight num">
                  <AnimNum value={mmm.totalSpend} format={fmtCHF} />
                </span>
              </div>
            </div>
          </Card>

          {/* Outputs panel */}
          <div className="space-y-3">
            {/* Headline numbers */}
            <Card>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Top-line mensuel projeté</div>
                  <div className="display text-[40px] font-semibold tracking-[-0.025em] leading-none mt-3 num">
                    <AnimNum value={mmm.totalRevenue} format={fmtCHF} />
                  </div>
                  <div className="text-[11.5px] text-mute mt-1.5">
                    Dont {fmtCHF(mmm.baseUplift)} base/organique
                    {snapshot && (
                      <span className={cn('ml-2 mono', mmm.totalRevenue > snapshot.totalRevenue ? 'text-ok' : 'text-mute')}>
                        {mmm.totalRevenue > snapshot.totalRevenue ? '+' : ''}{fmtCHF(mmm.totalRevenue - snapshot.totalRevenue)} vs avant
                      </span>
                    )}
                  </div>
                </div>
                <div className="border-l hair pl-6">
                  <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">ROAS pondéré</div>
                  <div className="display text-[40px] font-semibold tracking-[-0.025em] leading-none mt-3 num">
                    <AnimNum value={mmm.roas} format={(v) => v.toFixed(2).replace('.', ',') + '×'} />
                  </div>
                  <div className="text-[11.5px] text-mute mt-1.5">
                    Sur {fmtCHF(mmm.totalSpend)} dépensés
                    {snapshot && (
                      <span className={cn('ml-2 mono', mmm.roas > snapshot.roas ? 'text-ok' : 'text-mute')}>
                        {mmm.roas > snapshot.roas ? '+' : ''}{(mmm.roas - snapshot.roas).toFixed(2).replace('.', ',')}× vs avant
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Stacked bar */}
            <Card padded={false}>
              <div className="px-5 py-4 border-b hair flex items-center justify-between">
                <div className="display text-[15px] font-semibold tracking-tight">Contribution au top-line</div>
                <div className="text-[11px] text-mute mono uppercase">CHF / MOIS</div>
              </div>
              <div className="p-5">
                <MeasuredWidth className="h-[180px]">
                  {(w) => (
                    <RC.BarChart width={w} height={180} data={stackedData} layout="vertical" barCategoryGap={0} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <RC.XAxis type="number" hide />
                      <RC.YAxis type="category" dataKey="name" hide />
                      <RC.Tooltip
                        cursor={{ fill: 'rgba(10,10,10,0.04)' }}
                        contentStyle={{ background:'#fafaf7', border:'1px solid rgba(10,10,10,0.10)', borderRadius:0, fontSize:12, fontFamily:'JetBrains Mono' }}
                        formatter={(v, key) => {
                          const c = CHANNEL_BY_ID[key]; const name = c?.name || (key === 'base' ? 'Base / organique' : key);
                          return [fmtCHF(v), name];
                        }} />
                      {CHANNELS.map(c => (
                        <RC.Bar key={c.id} dataKey={c.id} stackId="a" fill={c.hue} isAnimationActive={false} />
                      ))}
                      <RC.Bar dataKey="base" stackId="a" fill="#bfbacf" isAnimationActive={false} />
                    </RC.BarChart>
                  )}
                </MeasuredWidth>
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
                  {mmm.perChannel.slice().sort((a, b) => b.revenue - a.revenue).map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-none" style={{background:c.hue}} />
                        <span className="truncate tracking-tight">{c.name}</span>
                      </span>
                      <span className="text-mute mono num">{fmtCHF(c.revenue)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:'#bfbacf'}} /><span className="tracking-tight">Base / organique</span></span>
                    <span className="text-mute mono num">{fmtCHF(mmm.baseUplift)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI rec */}
            <Card className={cn('relative', suggestion && 'bg-[#f7eeff]')}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border hair inline-flex items-center justify-center bg-paper"><IconSpark size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-accent mono uppercase tracking-[0.06em]">Recommandation Pupsic</div>
                  {suggestion ? (
                    <p className="display text-[18px] font-semibold tracking-tight mt-1.5 leading-snug">
                      Réallouer <span className="num">{fmtCHF(suggestion.amount)}</span> de{' '}
                      <span className="underline underline-offset-2 decoration-line">{CHANNEL_BY_ID[suggestion.fromId].name}</span> vers{' '}
                      <span className="underline underline-offset-2 decoration-accent">{CHANNEL_BY_ID[suggestion.toId].name}</span>{' '}
                      pour <span className="text-accent num">+{fmtCHF(suggestion.gain)}</span> de top-line à budget constant.
                    </p>
                  ) : (
                    <p className="display text-[16px] font-semibold tracking-tight mt-1.5">
                      Allocation équilibrée — ROAS marginaux alignés sur tous les canaux.
                    </p>
                  )}
                </div>
                {suggestion && (
                  <Button variant="ghost" size="sm" icon={<IconWand size={13}/>} onClick={optimize}>
                    Appliquer
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

Object.assign(window, { MMMScreen });
