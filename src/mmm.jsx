// Marketing Mix Model — flat editorial layout (Dashboard pattern)
const RC = window.Recharts;

function ChannelRow({ channel, spend, util, marginal, onSpend, animating, index }) {
  const c = channel;
  const isSaturated = util > 0.80;
  const isUnder = util < 0.30 && spend > 0;
  const tone = isSaturated ? 'bad' : isUnder ? 'ok' : 'neutral';

  // Tiny curve preview
  const points = useMemo(() => {
    const pts = [];
    const maxS = c.sat * 4;
    for (let i = 0; i <= 32; i++) {
      const s = (maxS * i) / 32;
      pts.push({ s, r: channelRevenue(c, s) });
    }
    return pts;
  }, [c.id]);

  return (
    <div className={cn('py-4 grid grid-cols-[20px_10px_1fr_88px] items-center gap-4 transition-colors',
                        animating && 'bg-accentSoft/40')}>
      <span className="t-caption text-mute tabular-nums self-start mt-1">{String(index + 1).padStart(2, '0')}</span>
      <span className="w-1.5 h-1.5 shrink-0 self-start mt-2" style={{ background: c.hue }} />
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="t-body text-ink truncate">{c.name}</span>
            {isSaturated && <span className="t-caption text-bad">Saturé</span>}
            {isUnder && <span className="t-caption text-ok">Sous-investi</span>}
          </div>
          <div className="t-num text-ink num tabular-nums shrink-0">
            <AnimNum value={spend} format={fmtCHF} />
          </div>
        </div>
        <input type="range" min={0} max={Math.round(c.sat * 3.5)} step={100}
               value={spend}
               onChange={(e) => onSpend(Number(e.target.value))}
               style={{ accentColor: c.hue }} />
        <div className="flex items-center justify-between t-caption text-mute mt-0.5">
          <span>ROAS marginal&nbsp;<span className="text-ink tabular-nums">{marginal.toFixed(2).replace('.', ',')}×</span></span>
          <span>Utilisation&nbsp;<span className={cn('tabular-nums', tone === 'bad' && 'text-bad', tone === 'ok' && 'text-ok', tone === 'neutral' && 'text-ink')}>{fmtPct(util, 0)}</span></span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="w-full h-14 -mt-1 self-center">
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
                <path d={path} stroke={c.hue} strokeWidth="1.2" fill="none" />
                <line x1={hx} x2={hx} y1="2" y2="54" stroke={c.hue} strokeOpacity="0.35" strokeDasharray="2 2" strokeWidth="1" />
                <circle cx={hx} cy={hy} r="2.5" fill={c.hue} stroke="#fafafd" strokeWidth="1.2" />
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
        <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">
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
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6 flex-wrap pb-10 mb-10 border-b hair">
          <div>
            <div className="t-caption text-mute">MMM · Marketing Mix Model</div>
            <h1 className="t-hero text-ink mt-3 max-w-[820px]">
              Allouez votre budget <span className="text-accent">comme un MMM</span>.
            </h1>
            <p className="t-body text-mute mt-3 max-w-[560px]">
              Réponse par canal modélisée en courbe de saturation. ROAS marginal calculé en continu —
              ajustez les curseurs ou laissez Pupsic optimiser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" icon={<IconUpload size={13}/>} onClick={importToMediaPlan}>
              Pousser vers media plan
            </Button>
            <Button variant="primary" size="sm"
                    onClick={optimize}
                    disabled={optimizing}
                    icon={optimizing ? <Spinner size={13}/> : <IconWand size={13}/>}>
              {optimizing ? 'Optimisation…' : 'Optimiser'}
            </Button>
          </div>
        </div>

        {/* ── Outcome strip ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-12 pb-12 mb-12 border-b hair items-start">
          <div>
            <div className="t-caption text-mute">Top-line mensuel projeté</div>
            <div className="t-hero text-accent mt-3 whitespace-nowrap">
              <AnimNum value={mmm.totalRevenue} format={fmtCHF} />
            </div>
            <div className="t-body text-mute mt-3 max-w-[400px]">
              Dont {fmtCHF(mmm.baseUplift)} base/organique
              {snapshot && (
                <span className={cn('block mt-1 tabular-nums', mmm.totalRevenue > snapshot.totalRevenue ? 'text-ok' : 'text-mute')}>
                  {mmm.totalRevenue > snapshot.totalRevenue ? '+' : ''}{fmtCHF(mmm.totalRevenue - snapshot.totalRevenue)} vs avant optimisation
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-6">
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">Dépense / mois</div>
              <div className="t-num text-ink mt-2"><AnimNum value={mmm.totalSpend} format={fmtCHF} /></div>
              <div className="t-body text-mute mt-1.5">{CHANNELS.length} canaux actifs</div>
            </div>
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">ROAS pondéré</div>
              <div className="t-num text-ink mt-2"><AnimNum value={mmm.roas} format={(v) => v.toFixed(2).replace('.', ',') + '×'} /></div>
              <div className="t-body text-mute mt-1.5">
                {snapshot && (mmm.roas > snapshot.roas ? '+' : '')}{snapshot ? (mmm.roas - snapshot.roas).toFixed(2).replace('.', ',') + '× vs avant' : 'sur dépense totale'}
              </div>
            </div>
            <div className="border-b hair pb-3">
              <div className="t-caption text-mute">Canaux saturés</div>
              <div className="t-num text-ink mt-2">{mmm.perChannel.filter(c => c.util > 0.80).length}</div>
              <div className="t-body text-mute mt-1.5">{mmm.perChannel.filter(c => c.util < 0.30 && c.spend > 0).length} sous-investis</div>
            </div>
          </div>
        </div>

        {/* ── AI recommendation ────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair flex items-start gap-4">
          <div className="w-8 h-8 inline-flex items-center justify-center border hair bg-paper shrink-0 mt-0.5">
            <IconSpark size={13} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="t-caption text-accent">Recommandation Pupsic</div>
            {suggestion ? (
              <>
                <p className="t-bodyhi mt-1.5 max-w-[760px] text-ink">
                  Réallouer <span className="num">{fmtCHF(suggestion.amount)}</span> de{' '}
                  <span className="underline underline-offset-2 decoration-line">{CHANNEL_BY_ID[suggestion.fromId].name}</span> vers{' '}
                  <span className="underline underline-offset-2 decoration-accent">{CHANNEL_BY_ID[suggestion.toId].name}</span>{' '}
                  pour <span className="text-accent num">+{fmtCHF(suggestion.gain)}</span> de top-line à budget constant.
                </p>
                <div className="mt-3.5">
                  <Button variant="primary" size="sm" icon={<IconWand size={13}/>} onClick={optimize}>
                    Appliquer
                  </Button>
                </div>
              </>
            ) : (
              <p className="t-bodyhi mt-1.5 text-ink">
                Allocation équilibrée — ROAS marginaux alignés sur tous les canaux.
              </p>
            )}
          </div>
        </div>

        {/* ── Channels list ────────────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Canaux · dépense mensuelle</div>
              <div className="t-caption text-mute mt-1">{CHANNELS.length} canaux · courbe de saturation par canal</div>
            </div>
            <div className="t-num text-ink tabular-nums">
              <AnimNum value={mmm.totalSpend} format={fmtCHF} />
            </div>
          </div>
          <div className="divide-y hair">
            {mmm.perChannel.map((c, i) => (
              <ChannelRow key={c.id}
                          index={i}
                          channel={c}
                          spend={c.spend}
                          util={c.util}
                          marginal={c.marginal}
                          animating={animSet.has(c.id)}
                          onSpend={(v) => setSpend(c.id, v)} />
            ))}
          </div>
        </div>

        {/* ── Radar: mix & saturation ──────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">Mix & plateau · radar</div>
              <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
                Polygone violet = part du budget · contour gris = utilisation du ceiling (plateau)
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12">
            <SpiderChart channels={mmm.perChannel} />
            <div className="grid grid-cols-1 gap-y-2 self-center">
              {mmm.perChannel.slice().sort((a, b) => b.revenue - a.revenue).map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 border-b hair">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-1.5 h-1.5 shrink-0" style={{background:c.hue}} />
                    <span className="t-body text-ink truncate">{c.name}</span>
                  </span>
                  <span className="t-body text-ink num tabular-nums">{fmtCHF(c.revenue)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5" style={{background:'#bfbacf'}} />
                  <span className="t-body text-mute">Base / organique</span>
                </span>
                <span className="t-body text-mute num tabular-nums">{fmtCHF(mmm.baseUplift)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Marginal ROAS table ──────────────────────────────────────── */}
        <div className="pb-12 mb-12 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="t-bodyhi text-ink">ROAS marginal · classement</div>
              <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
                Retour sur le prochain franc dépensé. Quand un canal sature, son marginal s'effondre — réallouer vers les canaux à fort marginal augmente le top-line.
              </div>
            </div>
          </div>
          <div className="divide-y hair">
            {mmm.perChannel
              .slice()
              .sort((a, b) => b.marginal - a.marginal)
              .map((c, i) => {
                const isTop = i === 0;
                const isBottom = i === mmm.perChannel.length - 1;
                const utilTone = c.util > 0.80 ? 'bad' : c.util < 0.30 ? 'ok' : 'neutral';
                return (
                  <div key={c.id} className="py-3 grid grid-cols-[20px_10px_1fr_110px_110px_110px] items-center gap-4">
                    <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="w-1.5 h-1.5 shrink-0" style={{ background: c.hue }} />
                    <div className="min-w-0">
                      <div className="t-body text-ink truncate">{c.name}</div>
                      <div className="t-caption text-mute mt-1">{fmtCHFShort(c.spend)} / mois</div>
                    </div>
                    <div className="text-right">
                      <div className="t-body text-ink num tabular-nums">{c.marginal.toFixed(2).replace('.', ',')}×</div>
                      <div className="t-caption text-mute mt-1">{isTop ? 'à investir' : isBottom ? 'saturé' : 'marginal'}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('t-body num tabular-nums',
                                          utilTone === 'bad' ? 'text-bad' : utilTone === 'ok' ? 'text-ok' : 'text-ink')}>
                        {fmtPct(c.util, 0)}
                      </div>
                      <div className="t-caption text-mute mt-1">ceiling</div>
                    </div>
                    <div className="text-right">
                      <div className="t-body text-ink num tabular-nums">{c.roas.toFixed(2).replace('.', ',')}×</div>
                      <div className="t-caption text-mute mt-1">moyen</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Source ───────────────────────────────────────────────────── */}
        <div className="t-caption text-mute normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
          Source · WordStream Industry Bench 2024 · Klaviyo Index 2024 · LinkedIn B2B Bench 2024.
          Courbes calibrées sur budgets SME suisses (CHF 80–250k/mo paid).
        </div>

      </div>
    </PageShell>
  );
}

Object.assign(window, { MMMScreen });

// ── Spider/radar chart for MMM mix + saturation ─────────────────────────
function SpiderChart({ channels }) {
  const N = channels.length;
  const W = 480, H = 320;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 56;
  const totalSpend = channels.reduce((a, c) => a + c.spend, 0) || 1;

  const angleAt = (i) => (i / N) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, r) => [cx + r * Math.cos(angleAt(i)), cy + r * Math.sin(angleAt(i))];

  const ringFrac = [0.25, 0.5, 0.75, 1.0];
  const sharePoly = channels.map((c, i) => {
    const share = c.spend / totalSpend;
    return pt(i, R * share * 2);
  });
  const utilPoly = channels.map((c, i) => pt(i, R * c.util));

  return (
    <MeasuredWidth className="h-[340px]">
      {(width) => (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height: 340 }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="mmmRadarFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.08" />
            </radialGradient>
          </defs>

          {ringFrac.map((f, ri) => (
            <polygon key={ri}
                     points={channels.map((_, i) => pt(i, R * f).join(',')).join(' ')}
                     fill="none"
                     stroke="rgba(19,16,34,0.10)"
                     strokeWidth="0.8"
                     strokeDasharray={ri === ringFrac.length - 1 ? '' : '2 3'} />
          ))}
          {channels.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                         stroke="rgba(19,16,34,0.08)" strokeWidth="0.6" />;
          })}

          <polygon points={utilPoly.map(p => p.join(',')).join(' ')}
                   fill="none" stroke="rgba(19,16,34,0.55)" strokeWidth="1.2"
                   strokeDasharray="3 2" />

          <polygon points={sharePoly.map(p => p.join(',')).join(' ')}
                   fill="url(#mmmRadarFill)" stroke="#8D0AF5" strokeWidth="1.4" strokeLinejoin="round" />

          {channels.map((c, i) => {
            const share = c.spend / totalSpend;
            const [x, y] = pt(i, R * share * 2);
            return <circle key={c.id} cx={x} cy={y} r="2.5" fill={c.hue} stroke="#fafafd" strokeWidth="1" />;
          })}

          {channels.map((c, i) => {
            const [x, y] = pt(i, R + 22);
            const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
            return (
              <g key={c.id}>
                <text x={x} y={y - 4} textAnchor={anchor}
                      fontSize="10.5" fill="#131022" fontFamily="Montserrat, sans-serif" fontWeight="500">
                  {c.name.split(' ')[0]}
                </text>
                <text x={x} y={y + 8} textAnchor={anchor}
                      fontSize="9" fill="#6e6a85" fontFamily="Montserrat, sans-serif" letterSpacing="0.04em">
                  {fmtPct(c.util, 0)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </MeasuredWidth>
  );
}
