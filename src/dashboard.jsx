// ╔══════════════════════════════════════════════════════════════════════╗
// ║  Dashboard — RevOps top-down vs bottom-up reconciliation             ║
// ║                                                                      ║
// ║  Three sections, no Cards, flat canvas:                              ║
// ║    1. Header + target slider                                         ║
// ║    2. Reconciliation: TARGET vs PROJECTION vs GAP                    ║
// ║    3. Levers to close the gap (or distribute the upside)             ║
// ║    4. Health signals (units, capacity, funnel, retention)            ║
// ╚══════════════════════════════════════════════════════════════════════╝

function DashboardScreen({ user, plan, profile, scenarios, mmmSpend,
                            annualTarget, setAnnualTarget, go }) {
  const model = useRevOpsModel({
    profile, mmmSpend,
    target: annualTarget,
  });

  // Reconciliation core numbers
  const target = model.annualTarget;
  const projected = model.bottomUp.annual;
  const gap = model.topDown.gap;
  const gapPct = target > 0 ? gap / target : 0;
  const onTarget = Math.abs(gapPct) <= 0.05;
  const gapTone = onTarget ? 'text-ok' : gap > 0 ? 'text-bad' : 'text-accent';
  const gapLabel = onTarget ? 'À l\'équilibre' : gap > 0 ? 'Manque' : 'Surplus';

  // Slider bounds
  const min = Math.max(500_000, Math.round((profile?.caAnnuel || 4_800_000) * 0.5 / 100_000) * 100_000);
  const max = Math.max(min * 5, Math.round((profile?.caAnnuel || 4_800_000) * 3 / 100_000) * 100_000);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/dashboard" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6 flex-wrap pb-10 mb-10 border-b hair">
          <div>
            <div className="t-caption text-mute">
              {new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="t-hero text-ink mt-3">
              Bonjour, <span className="text-accent">{user?.name || 'invité'}</span>.
            </h1>
            <p className="t-body text-mute mt-3 max-w-[520px]">
              Combien votre moteur actuel produit · ce que votre cible exige · l'écart à combler.
            </p>
          </div>
        </div>

        {/* ── Target slider ────────────────────────────────────────────── */}
        <div className="pb-10 mb-10 border-b hair">
          <div className="flex items-baseline justify-between mb-5">
            <div className="t-bodyhi text-ink">Cible annuelle</div>
            <div className="t-num text-accent">{fmtCHFShort(target)}</div>
          </div>
          <input type="range" min={min} max={max} step={100_000}
                 value={target} onChange={(e) => setAnnualTarget(Number(e.target.value))}
                 className="w-full accent-accent" />
          <div className="flex items-center justify-between t-caption text-mute mt-2">
            <span>{fmtCHFShort(min)}</span>
            <span>basé sur votre CA · {fmtCHFShort(profile?.caAnnuel || 0)}</span>
            <span>{fmtCHFShort(max)}</span>
          </div>
        </div>

        {/* ── Reconciliation: 3 columns top-down / bottom-up / gap ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-12 mb-12 border-b hair">
          {/* Top-down */}
          <div>
            <div className="t-caption text-mute">Top-down · cible</div>
            <div className="t-hero text-ink mt-3">
              <AnimNum value={target} format={fmtCHFShort} />
            </div>
            <p className="t-body text-mute mt-3">
              Annuel exigé. Tweak le curseur pour scénariser un autre objectif.
            </p>
          </div>
          {/* Bottom-up */}
          <div className="lg:border-l hair lg:pl-12">
            <div className="t-caption text-mute">Bottom-up · projeté</div>
            <div className="t-hero text-ink mt-3">
              <AnimNum value={projected} format={fmtCHFShort} />
            </div>
            <p className="t-body text-mute mt-3">
              Au mix média actuel ({fmtCHF(model.mmm.totalSpend)} / mois) sur 12 mois.
            </p>
            <div className="mt-4 space-y-2">
              <ReconRow label="Parc existant"  value={model.bottomUp.existing}   pct={model.bottomUp.existing / projected} />
              <ReconRow label="Nouveaux clients" value={model.bottomUp.newAcq}   pct={model.bottomUp.newAcq   / projected} />
            </div>
          </div>
          {/* Gap */}
          <div className="lg:border-l hair lg:pl-12">
            <div className="t-caption text-mute">{gapLabel}</div>
            <div className={cn('t-hero mt-3', gapTone)}>
              {gap >= 0 ? '−' : '+'}<AnimNum value={Math.abs(gap)} format={fmtCHFShort} />
            </div>
            <p className="t-body text-mute mt-3">
              {fmtPct(Math.abs(gapPct), 0)} de la cible.
              {onTarget && ' Trajectoire alignée.'}
              {!onTarget && gap > 0 && ' Activez les leviers ci-dessous.'}
              {!onTarget && gap < 0 && ' Sandbag ? Réinvestissez ou ajustez la cible.'}
            </p>
          </div>
        </div>

        {/* ── Levers ───────────────────────────────────────────────────── */}
        {model.levers.length > 0 && (
          <div className="pb-12 mb-12 border-b hair">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="t-bodyhi text-ink">Leviers pour combler l'écart</div>
                <div className="t-caption text-mute mt-1">
                  Chaque levier estimé indépendamment, impact cumulatif non additif.
                </div>
              </div>
            </div>
            <div className="divide-y hair">
              {model.levers.map((lev, i) => (
                <div key={lev.id} className="py-4 grid grid-cols-[24px_1fr_140px_140px] items-baseline gap-6">
                  <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="t-body text-ink">{lev.label}</div>
                    <p className="t-caption text-mute mt-1 normal-case tracking-normal leading-relaxed"
                       style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                      {lev.rationale}
                    </p>
                    {lev.id === 'budget' && (
                      <GrowthFinancingNote monthlyDelta={lev.delta}
                                            annualNeed={lev.delta * 12}
                                            go={go} />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="t-num text-ink">{fmtNum(Math.round(lev.delta))}</div>
                    <div className="t-caption text-mute mt-1">{lev.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="t-num text-accent">+{fmtCHFShort(lev.impact)}</div>
                    <div className="t-caption text-mute mt-1">impact / an</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Health: funnel / capacity / units / retention ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 pb-12 mb-12 border-b hair">
          <HealthBlock
            label="Funnel"
            value={fmtNum(Math.round(model.funnel.leads.monthly))}
            unit="leads / mois"
            sub={`Cycle ${model.funnel.salesCycleDays}j · Win ${fmtPct(model.funnel.won.conv, 0)}`}
            onClick={() => go('app/calculator')}
          />
          <HealthBlock
            label="Capacité commerciale"
            value={model.capacity.aeCount > 0
              ? fmtCHFShort(model.capacity.rampedCapacity)
              : '—'}
            unit={model.capacity.aeCount > 0
              ? `${model.capacity.aeCount} AE × quota ${fmtCHFShort(model.capacity.aeQuota)}`
              : 'Sans AE'}
            sub={model.capacity.aeCount > 0
              ? `Coverage ${fmtPct(model.capacity.pipelineCoverage, 0)} de la cible`
              : 'Self-serve / inbound only'}
          />
          <HealthBlock
            label="Unit economics"
            value={`${model.units.ltvCacRatio > 0 ? model.units.ltvCacRatio.toFixed(1).replace('.', ',') + '×' : '—'}`}
            unit="LTV / CAC"
            sub={`CAC ${fmtCHF(model.units.cac)} · LTV ${fmtCHFShort(model.units.ltv)} · payback ${model.units.cacPaybackMo > 0 ? model.units.cacPaybackMo.toFixed(0) + ' mois' : '—'}`}
            tone={model.units.ltvCacRatio >= 3 ? 'ok' : 'warn'}
          />
          <HealthBlock
            label="Rétention"
            value={`${(Math.pow(0.93, 12) * 100).toFixed(0)}%`}
            unit="rétention 12 mois"
            sub={`${fmtNum(Math.round(model.bottomUp.churned))} clients churnés / an sans intervention`}
            onClick={() => go('app/rfm')}
          />
        </div>

        {/* ── Flags ───────────────────────────────────────────────────── */}
        {model.flags.length > 0 && (
          <div className="pb-12 mb-12 border-b hair">
            <div className="t-bodyhi text-ink mb-5">Signaux d'alerte</div>
            <div className="space-y-2">
              {model.flags.map(f => (
                <div key={f.id} className="flex items-start gap-3 py-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                                       f.tone === 'bad' ? 'bg-bad' : f.tone === 'warn' ? 'bg-warn' : 'bg-mute')} />
                  <div className="t-body text-ink">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick links to deep-dive modules ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-4">
          <DeepLink label="MMM" sub="Optimiser le mix paid" onClick={() => go('app/mmm')} />
          <DeepLink label="Media Plan" sub="Distribuer sur 12 mois" onClick={() => go('app/media-plan')} />
          <DeepLink label="RFM" sub="Décomposer la base" onClick={() => go('app/rfm')} />
          <DeepLink label="Leak Calc" sub="Diagnostiquer le funnel" onClick={() => go('app/calculator')} />
        </div>

      </div>
    </PageShell>
  );
}

// ── Small primitives — flat, no Cards ─────────────────────────────────
function ReconRow({ label, value, pct }) {
  return (
    <div className="grid grid-cols-[1fr_80px_90px] items-center gap-3">
      <div className="t-body text-mute truncate">{label}</div>
      <div className="h-[2px] bg-line2 relative overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${(pct || 0) * 100}%` }} />
      </div>
      <div className="t-body text-ink num text-right">{fmtCHFShort(value)}</div>
    </div>
  );
}

function HealthBlock({ label, value, unit, sub, onClick, tone }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick}
         className={cn('text-left transition-colors w-full',
                        onClick && 'hover:text-accent')}>
      <div className="t-caption text-mute">{label}</div>
      <div className={cn('t-hero mt-3',
                          tone === 'ok' ? 'text-ink' : tone === 'warn' ? 'text-warn' : 'text-ink')}
           style={{ fontSize: 24 }}>
        {value}
      </div>
      <div className="t-caption text-mute mt-2">{unit}</div>
      {sub && <div className="t-body text-mute mt-2">{sub}</div>}
    </Tag>
  );
}

function DeepLink({ label, sub, onClick }) {
  return (
    <button onClick={onClick} className="text-left group">
      <div className="t-body text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
        {label}
        <IconArrowRight size={11} className="text-mute group-hover:text-accent translate-x-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="t-caption text-mute mt-1">{sub}</div>
    </button>
  );
}

Object.assign(window, { DashboardScreen });
