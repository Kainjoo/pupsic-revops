// Plan-page charts and visualisations.
// All hand-rolled SVG to avoid Recharts overhead; share a common viewBox API.

// ─── Common helpers ──────────────────────────────────────────────────
function chartScales(months, key, padding = 1.08, allowNegative = false) {
  const vals = months.map(m => m[key] || 0);
  const maxV = Math.max(...vals, 0) * padding || 1;
  const minV = allowNegative ? Math.min(0, ...vals) * padding : 0;
  return { maxV, minV, range: maxV - minV };
}

// ─── CAC / LTV optional input card (Step I) ──────────────────────────
function KnownEconomics({ profile, cacKnown, setCacKnown, ltvKnown, setLtvKnown }) {
  const ind = INDUSTRIES[profile?.industry] || INDUSTRIES.saas_b2b;
  const country = COUNTRIES.find(c => c.id === profile?.country) || COUNTRIES[0];
  const lc = LIFECYCLES[profile?.lifecycle] || LIFECYCLES.growth;
  const margin = lc.marginOverride != null ? lc.marginOverride : (ind.margin || 0.6);

  // Inferred values for placeholder hints
  const inferredCAC = Math.round((ind.panier || 1850) * 0.30 * (country.cacIndex || 1));
  const inferredLTV = Math.round((ind.panier || 1850) * (ind.ltvMult || 2.5) * margin);

  const cacInput = useRef(null);
  const ltvInput = useRef(null);

  return (
    <div className="mt-4 border hair bg-paper2/30">
      <div className="px-5 py-4 border-b hair flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Vos économiques clients · optionnel</div>
          <div className="display text-[14px] tracking-tight mt-0.5">Connaissez-vous votre CAC et votre LTV ?</div>
        </div>
        <div className="text-[11px] text-mute">Si vide → inféré depuis {ind.name}</div>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input label="CAC actuel (CHF / client)" prefix="CHF" type="number"
                 value={cacKnown ?? ''}
                 placeholder={String(inferredCAC)}
                 onChange={(e) => {
                   const v = e.target.value.trim();
                   setCacKnown(v === '' ? null : Math.max(0, Number(v) || 0));
                 }} />
          <div className="text-[10.5px] text-mute mt-1.5">
            {cacKnown != null
              ? <>Override actif · benchmark <span className="num">{fmtCHF(inferredCAC)}</span></>
              : <>Benchmark inféré · <span className="num text-ink font-semibold">{fmtCHF(inferredCAC)}</span></>}
          </div>
        </div>
        <div>
          <Input label="LTV moyen (CHF / client)" prefix="CHF" type="number"
                 value={ltvKnown ?? ''}
                 placeholder={String(inferredLTV)}
                 onChange={(e) => {
                   const v = e.target.value.trim();
                   setLtvKnown(v === '' ? null : Math.max(0, Number(v) || 0));
                 }} />
          <div className="text-[10.5px] text-mute mt-1.5">
            {ltvKnown != null
              ? <>Override actif · benchmark <span className="num">{fmtCHF(inferredLTV)}</span></>
              : <>Benchmark inféré · <span className="num text-ink font-semibold">{fmtCHF(inferredLTV)}</span></>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 1. Revenue stack + cumulative cost overlay ──────────────────────
function RevenueCostChart({ months, monthlyBudget, currency = 'CHF' }) {
  const W = 760, H = 240, padL = 56, padR = 56, padT = 16, padB = 30;
  const N = months.length;
  // Left axis: revenue cumulative; Right axis: cost cumulative (different scale)
  let cumExisting = 0, cumNew = 0, cumCost = 0;
  const series = months.map((m, i) => {
    cumExisting += m.existingRev;
    cumNew      += m.newRev;
    cumCost     += monthlyBudget;
    return { ...m, cumExisting, cumNew, cumTotal: cumExisting + cumNew, cumCost };
  });
  const yMax = Math.max(...series.map(s => s.cumTotal)) * 1.08 || 1;
  const costMax = Math.max(...series.map(s => s.cumCost)) * 1.08 || 1;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xAt = (i) => padL + (i / (N - 1)) * innerW;
  const yAtRev  = (v) => padT + innerH - (v / yMax) * innerH;
  const yAtCost = (v) => padT + innerH - (v / costMax) * innerH;

  const existingPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAtRev(s.cumExisting).toFixed(1)}`).join(' ');
  const totalPath    = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAtRev(s.cumTotal).toFixed(1)}`).join(' ');
  const costPath     = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAtCost(s.cumCost).toFixed(1)}`).join(' ');

  const newArea      = `${totalPath} ${series.slice().reverse().map((s, i) => `L ${xAt(N - 1 - i).toFixed(1)} ${yAtRev(s.cumExisting).toFixed(1)}`).join(' ')} Z`;
  const existingArea = `${existingPath} L ${xAt(N - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  return (
    <MeasuredWidth className="h-[260px]">
      {(w) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: w, height: 240 }} preserveAspectRatio="none">
            {[0,0.25,0.5,0.75,1].map((t,i) => (
              <g key={i}>
                <line x1={padL} x2={W-padR} y1={yAtRev(yMax*t)} y2={yAtRev(yMax*t)} stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={i===0?'':'2 3'} />
                <text x={padL-6} y={yAtRev(yMax*t)+3} textAnchor="end" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{fmtMoneyShort(yMax*t, currency)}</text>
                <text x={W-padR+6} y={yAtCost(costMax*t)+3} textAnchor="start" fontSize="9" fill="#8D0AF5" fontFamily="Montserrat">{fmtMoneyShort(costMax*t, currency)}</text>
              </g>
            ))}
            <path d={existingArea} fill="#13102222" />
            <path d={newArea} fill="#8D0AF522" />
            <path d={existingPath} stroke="#131022" strokeWidth="1.3" fill="none" />
            <path d={totalPath} stroke="#8D0AF5" strokeWidth="1.8" fill="none" />
            <path d={costPath} stroke="#8D0AF5" strokeWidth="1.4" fill="none" strokeDasharray="3 2" opacity="0.7" />
            {series.map((s, i) => (i % 2 === 0 || i === N-1) && (
              <text key={i} x={xAt(i)} y={H-padB+14} textAnchor="middle" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{s.label}</text>
            ))}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px] flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-[10px] bg-ink/15 border-y border-ink/40" /><span className="text-mute">CA existant cumulé</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-[10px] bg-accent/20 border-y border-accent" /><span className="text-mute">CA nouveau cumulé</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-px border-t border-dashed border-accent" /><span className="text-accent">Coût cumulé (axe droit)</span></span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

// ─── 2. Speed of growth — MoM Δ revenue ──────────────────────────────
function SpeedOfGrowthChart({ months, currency = 'CHF' }) {
  const W = 760, H = 220, padL = 56, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const N = months.length;
  const deltas = months.map((m, i) => i === 0 ? 0 : m.totalRev - months[i-1].totalRev);
  const maxD = Math.max(...deltas, 0) * 1.10 || 1;
  const minD = Math.min(...deltas, 0) * 1.10;
  const range = maxD - minD;
  const yAt = (v) => padT + innerH - ((v - minD) / range) * innerH;
  const groupW = innerW / N;
  const barW = groupW * 0.55;

  return (
    <MeasuredWidth className="h-[240px]">
      {(w) => (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: w, height: 220 }} preserveAspectRatio="none">
          {[0,0.25,0.5,0.75,1].map((t,i) => (
            <g key={i}>
              <line x1={padL} x2={W-padR} y1={yAt(minD+range*t)} y2={yAt(minD+range*t)} stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={t===0?'':'2 3'} />
              <text x={padL-6} y={yAt(minD+range*t)+3} textAnchor="end" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{fmtMoneyShort(minD+range*t, currency)}</text>
            </g>
          ))}
          {minD < 0 && <line x1={padL} x2={W-padR} y1={yAt(0)} y2={yAt(0)} stroke="rgba(19,16,34,0.30)" strokeWidth="0.8" />}
          {months.map((m, i) => {
            const cx = padL + (i + 0.5) * groupW;
            const v = deltas[i];
            return (
              <g key={i}>
                <rect x={cx - barW/2} y={Math.min(yAt(v), yAt(0))} width={barW} height={Math.abs(yAt(v) - yAt(0))} fill={v >= 0 ? '#8D0AF5' : '#b91c1c'} />
                {(i % 2 === 0 || i === N-1) && <text x={cx} y={H-padB+14} textAnchor="middle" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{m.label}</text>}
              </g>
            );
          })}
        </svg>
      )}
    </MeasuredWidth>
  );
}

// ─── 3. Churn vs new clients — stacked bars per month ────────────────
function ChurnVsNewChart({ months }) {
  const W = 760, H = 220, padL = 56, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const N = months.length;
  const maxV = Math.max(...months.map(m => Math.max(m.newCustomers, m.churnedCustomers || 0))) * 1.10 || 1;
  const minV = -maxV; // mirror — new above zero, churn below
  const range = maxV - minV;
  const yAt = (v) => padT + innerH - ((v - minV) / range) * innerH;
  const groupW = innerW / N;
  const barW = groupW * 0.55;

  return (
    <MeasuredWidth className="h-[240px]">
      {(w) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: w, height: 220 }} preserveAspectRatio="none">
            <line x1={padL} x2={W-padR} y1={yAt(0)} y2={yAt(0)} stroke="rgba(19,16,34,0.30)" strokeWidth="0.8" />
            {[-1,-0.5,0.5,1].map((t,i) => (
              <g key={i}>
                <line x1={padL} x2={W-padR} y1={yAt(maxV*t)} y2={yAt(maxV*t)} stroke="rgba(19,16,34,0.08)" strokeWidth="0.5" strokeDasharray="2 3" />
                <text x={padL-6} y={yAt(maxV*t)+3} textAnchor="end" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{fmtNum(Math.abs(maxV*t))}</text>
              </g>
            ))}
            {months.map((m, i) => {
              const cx = padL + (i + 0.5) * groupW;
              const newC = m.newCustomers || 0;
              const churn = -(m.churnedCustomers || 0);
              return (
                <g key={i}>
                  <rect x={cx - barW/2} y={yAt(newC)} width={barW} height={Math.abs(yAt(newC) - yAt(0))} fill="#8D0AF5" />
                  <rect x={cx - barW/2} y={yAt(0)} width={barW} height={Math.abs(yAt(churn) - yAt(0))} fill="#6e6a85" />
                  {(i % 2 === 0 || i === N-1) && <text x={cx} y={H-padB+14} textAnchor="middle" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{m.label}</text>}
                </g>
              );
            })}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-accent" /><span className="text-accent">Nouveaux clients</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-mute" /><span className="text-mute">Clients churnés</span></span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

// ─── 4. CAC vs LTV trajectory — dual line ────────────────────────────
function CacLtvChart({ months, monthlyBudget, ltv, currency = 'CHF' }) {
  // Per-month CAC = (monthly spend) / (new customers that month)
  // LTV stays constant (assumed) but visual line for comparison
  const W = 760, H = 220, padL = 60, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const N = months.length;
  const cacSeries = months.map(m => m.newCustomers > 0 ? monthlyBudget / m.newCustomers : 0);
  const maxV = Math.max(...cacSeries, ltv) * 1.10 || 1;
  const yAt = (v) => padT + innerH - (v / maxV) * innerH;
  const xAt = (i) => padL + (i / (N - 1)) * innerW;
  const cacPath = cacSeries.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
  const ltvY = yAt(ltv);

  return (
    <MeasuredWidth className="h-[240px]">
      {(w) => (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: w, height: 220 }} preserveAspectRatio="none">
            {[0,0.25,0.5,0.75,1].map((t,i) => (
              <g key={i}>
                <line x1={padL} x2={W-padR} y1={yAt(maxV*t)} y2={yAt(maxV*t)} stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" strokeDasharray={i===0?'':'2 3'} />
                <text x={padL-6} y={yAt(maxV*t)+3} textAnchor="end" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{fmtMoneyShort(maxV*t, currency)}</text>
              </g>
            ))}
            {/* LTV horizontal line */}
            <line x1={padL} x2={W-padR} y1={ltvY} y2={ltvY} stroke="#8D0AF5" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={W-padR-4} y={ltvY-4} textAnchor="end" fontSize="9" fill="#8D0AF5" fontFamily="Montserrat" fontWeight="600">LTV {fmtMoneyShort(ltv, currency)}</text>
            {/* CAC line */}
            <path d={cacPath} stroke="#131022" strokeWidth="1.8" fill="none" />
            {months.map((m, i) => (i % 2 === 0 || i === N-1) && (
              <text key={i} x={xAt(i)} y={H-padB+14} textAnchor="middle" fontSize="9" fill="#6e6a85" fontFamily="Montserrat">{m.label}</text>
            ))}
          </svg>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-ink" /><span className="text-ink">CAC mensuel</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-px border-t border-dashed border-accent" /><span className="text-accent">LTV ({fmtMoney(ltv, currency)})</span></span>
          </div>
        </>
      )}
    </MeasuredWidth>
  );
}

// ─── 5. RFM Adoption Ladder — horizontal stepped flow ────────────────
// Shows the starting RFM mix vs the end-of-horizon RFM mix as horizontal stacked bars,
// with arrows hinting at the upward movement.
function RfmAdoptionLadder({ months }) {
  if (!months.length) return null;
  const start = months[0].segmentSnapshot || [];
  const end   = months[months.length - 1].segmentSnapshot || [];
  const order = ['at_risk', 'casual', 'loyal', 'champions'];
  const startTotal = start.reduce((a, s) => a + s.count, 0) || 1;
  const endTotal   = end.reduce((a, s) => a + s.count, 0) || 1;

  const startMap = Object.fromEntries(start.map(s => [s.id, s.count]));
  const endMap   = Object.fromEntries(end.map(s => [s.id, s.count]));

  return (
    <div className="p-5">
      <div className="grid grid-cols-[80px_1fr] gap-3 items-center mb-3">
        <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">M1 · début</div>
        <div className="flex h-7 border hair overflow-hidden">
          {order.map(id => {
            const seg = RFM_SEGMENTS.find(s => s.id === id);
            const v = startMap[id] || 0;
            const pct = (v / startTotal) * 100;
            return (
              <div key={id} title={`${seg?.name} · ${Math.round(v)}`}
                   style={{ width: `${pct}%`, background: seg?.hue }}
                   className="text-[10px] text-white px-1.5 flex items-center font-medium whitespace-nowrap overflow-hidden">
                {pct > 8 && `${pct.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
        <div className="mono text-[10px] uppercase tracking-[0.06em] text-accent">M12 · fin</div>
        <div className="flex h-7 border border-accent overflow-hidden">
          {order.map(id => {
            const seg = RFM_SEGMENTS.find(s => s.id === id);
            const v = endMap[id] || 0;
            const pct = (v / endTotal) * 100;
            return (
              <div key={id} title={`${seg?.name} · ${Math.round(v)}`}
                   style={{ width: `${pct}%`, background: seg?.hue }}
                   className="text-[10px] text-white px-1.5 flex items-center font-medium whitespace-nowrap overflow-hidden">
                {pct > 8 && `${pct.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend + delta */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {order.map(id => {
          const seg = RFM_SEGMENTS.find(s => s.id === id);
          const s0 = startMap[id] || 0;
          const s1 = endMap[id] || 0;
          const delta = s1 - s0;
          const sign = delta > 0 ? '+' : '';
          return (
            <div key={id} className="border hair p-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5" style={{ background: seg?.hue }} />
                <span className="text-[12px] font-semibold tracking-tight">{seg?.name}</span>
              </div>
              <div className="display text-[18px] font-semibold tracking-tight num mt-1.5">
                {fmtNum(Math.round(s1))}
              </div>
              <div className={cn('text-[10.5px] mono uppercase tracking-[0.06em] mt-0.5',
                delta > 0 ? 'text-ok' : delta < 0 ? 'text-bad' : 'text-mute')}>
                {sign}{fmtNum(Math.round(delta))} vs M1
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-[11.5px] text-mute leading-snug">
        L'échelle d'adoption Pupsic suit la progression Casual → Loyal → Champions.
        Les barres ci-dessus comparent la composition de votre base au début et à la fin de l'horizon.
      </div>
    </div>
  );
}

// ─── 6. Channel enabler radar (spider chart) ─────────────────────────
function ChannelRadar({ mmmSpend }) {
  const totals = ENABLER_ORDER.map(eid => {
    let s = 0;
    for (const c of CHANNELS) {
      if (CHANNEL_ENABLERS[c.id]?.id === eid) s += (mmmSpend[c.id] || 0);
    }
    return { id: eid, label: ENABLER_META[eid].label, hue: ENABLER_META[eid].hue, value: s };
  });
  const maxV = Math.max(...totals.map(t => t.value)) * 1.05 || 1;
  const totalSum = totals.reduce((a, t) => a + t.value, 0) || 1;

  const W = 360, H = 320, cx = W / 2, cy = H / 2 + 8, R = 110;
  const angleAt = (i) => (-Math.PI / 2) + (i / ENABLER_ORDER.length) * 2 * Math.PI;
  const ptAt = (i, r) => [cx + Math.cos(angleAt(i)) * r, cy + Math.sin(angleAt(i)) * r];

  const dataPath = totals.map((t, i) => {
    const [x, y] = ptAt(i, (t.value / maxV) * R);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';

  return (
    <MeasuredWidth className="h-[340px]">
      {(w) => (
        <div className="flex items-center gap-6">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.min(360, w * 0.55), height: 320 }} preserveAspectRatio="xMidYMid meet">
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map((t, i) => {
              const pts = ENABLER_ORDER.map((_, idx) => ptAt(idx, R * t));
              const path = pts.map(([x, y], j) => `${j === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
              return <path key={i} d={path} fill="none" stroke="rgba(19,16,34,0.08)" strokeWidth="0.6" />;
            })}
            {/* Axes */}
            {ENABLER_ORDER.map((_, i) => {
              const [x, y] = ptAt(i, R);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(19,16,34,0.10)" strokeWidth="0.6" />;
            })}
            {/* Data polygon */}
            <path d={dataPath} fill="#8D0AF522" stroke="#8D0AF5" strokeWidth="1.6" />
            {/* Data dots */}
            {totals.map((t, i) => {
              const [x, y] = ptAt(i, (t.value / maxV) * R);
              return <circle key={i} cx={x} cy={y} r="3" fill="#8D0AF5" stroke="#fafafd" strokeWidth="1" />;
            })}
            {/* Axis labels */}
            {totals.map((t, i) => {
              const [x, y] = ptAt(i, R + 22);
              return (
                <text key={i} x={x} y={y + 3} textAnchor="middle"
                      fontSize="10" fill="#131022" fontFamily="Montserrat" fontWeight="600">
                  {t.label}
                </text>
              );
            })}
          </svg>

          {/* Legend table */}
          <div className="flex-1 min-w-0 space-y-2">
            {totals.slice().sort((a, b) => b.value - a.value).map(t => {
              const pct = totalSum > 0 ? t.value / totalSum : 0;
              return (
                <div key={t.id} className="grid grid-cols-[1fr_60px_70px] items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2" style={{ background: t.hue }} />
                    <span className="text-[12.5px] tracking-tight font-medium">{t.label}</span>
                  </div>
                  <div className="h-1.5 bg-line2 relative overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="text-right num text-[12px] font-semibold">{fmtCHFShort(t.value)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </MeasuredWidth>
  );
}

Object.assign(window, {
  KnownEconomics,
  RevenueCostChart, SpeedOfGrowthChart, ChurnVsNewChart, CacLtvChart,
  RfmAdoptionLadder, ChannelRadar,
});
