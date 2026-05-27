// Dashboard
function KPI({ label, value, sub, format = fmtCHF, accentNum }) {
  return (
    <Card className="flex flex-col justify-between min-h-[160px]" hover>
      <div className="text-[11px] text-mute mono uppercase tracking-[0.06em]">{label}</div>
      <div>
        <div className={cn('display text-[36px] lg:text-[40px] font-semibold tracking-[-0.025em] leading-none num',
                            accentNum && 'text-accent')}>
          <AnimNum value={value} format={format} />
        </div>
        <div className="text-[11.5px] text-mute mt-2 tracking-tight truncate">{sub || '\u00a0'}</div>
      </div>
    </Card>
  );
}

function QuickAction({ title, hint, icon, gated, onClick, need }) {
  return (
    <button onClick={onClick} disabled={gated}
            className={cn('group text-left p-5 border hair flex flex-col gap-3 min-h-[140px] bg-paper transition-colors',
                          gated ? 'opacity-65 cursor-not-allowed' : 'hover:border-accent/40 hover:bg-[#f7eeff]')}>
      <div className="flex items-center justify-between">
        <span className="w-9 h-9 inline-flex items-center justify-center border hair bg-paper">{icon}</span>
        {gated ? <Badge tone="line" className="mono"><IconLock size={10} /> {need.toUpperCase()}</Badge>
               : <IconArrowRight size={14} className="text-mute group-hover:text-ink transition-colors" />}
      </div>
      <div>
        <div className="display text-[17px] font-semibold tracking-tight">{title}</div>
        <div className="text-[12.5px] text-mute mt-1 leading-snug">{hint}</div>
      </div>
    </button>
  );
}

function DashboardScreen({ user, plan, profile, scenarios, mediaPlan, mmmSpend, go }) {
  const mmm = useMemo(() => computeMMM(mmmSpend), [mmmSpend]);
  const lastScenario = scenarios[0];
  const scenarioCalc = useMemo(() => lastScenario ? computeScenario(lastScenario.inputs) : null, [lastScenario]);
  const score = useMemo(() => computeRevopsScore(profile?.maturity), [profile?.maturity]);
  const tierMeta = MATURITY_TIERS[score.tier];
  const weakest = useMemo(() => {
    const dims = score.dimensions.filter(d => Number.isFinite(d.value));
    if (dims.length === 0) return [];
    const min = Math.min(...dims.map(d => d.value));
    return dims.filter(d => d.value === min).slice(0, 2);
  }, [score]);

  const topLineAnnual = (mmm.totalRevenue * 12) || (scenarioCalc ? scenarioCalc.optimised * 12 : 0);
  const monthlyLeak = scenarioCalc?.totalLeak || 0;
  const budgetAlloc = mmm.totalSpend;

  const planObj = PLANS[plan];

  return (
    <PageShell user={user} plan={plan} currentScreen="app/dashboard" go={go} logout={() => go('login')}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 lg:py-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <div className="text-[12px] text-mute mono uppercase">{new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="display text-[40px] lg:text-[48px] font-bold tracking-[-0.025em] leading-[1.02] mt-1">
              Bonjour, <span className="text-accent">{user?.name || 'invité'}</span>.
            </h1>
            <p className="text-[14px] text-mute mt-2 max-w-[560px]">
              Voici l'état de votre moteur de croissance, snapshot du mois en cours.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone="ink" className="mono">PLAN {planObj.name.toUpperCase()} · CHF {planObj.priceCHF}/MOIS</Badge>
            <button onClick={() => go('pricing')} className="text-[12.5px] text-mute hover:text-ink underline underline-offset-4 decoration-line">
              Changer de plan →
            </button>
          </div>
        </div>

        {/* RevOps Score — hero */}
        <RevOpsScoreHero score={score} tierMeta={tierMeta} weakest={weakest}
                          profile={profile} go={go} />

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l hair">
          <div className="border-r border-b hair"><KPI label="Top-line annuel projeté"
                value={topLineAnnual}
                sub={`Mix actuel · uplift organique ${fmtPct(ORGANIC_UPLIFT)}`}
                format={fmtCHFShort} /></div>
          <div className="border-r border-b hair"><KPI label="ROAS moyen pondéré"
                value={mmm.roas}
                sub={`Sur ${fmtCHFShort(mmm.totalSpend)} / mois`}
                format={(v) => `${v.toFixed(2).replace('.', ',')}×`} /></div>
          <div className="border-r border-b hair"><KPI label="Fuite mensuelle estimée"
                value={monthlyLeak}
                accentNum
                sub={lastScenario ? `${lastScenario.name}` : 'Aucun scénario'}
                format={fmtCHF} /></div>
          <div className="border-r border-b hair"><KPI label="Budget média alloué / mois"
                value={budgetAlloc}
                sub={`${CHANNELS.length} canaux actifs`}
                format={fmtCHF} /></div>
        </div>

        {/* Quick actions */}
        <div className="mt-10 mb-4 flex items-center justify-between">
          <h2 className="display text-[20px] font-semibold tracking-tight">Actions rapides</h2>
          <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">{PLANS[plan].name} · ce mois-ci</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickAction
            title="Nouveau scénario"
            hint="Diagnostic des fuites pipeline en 7 inputs."
            icon={<IconCalculator size={16} />}
            onClick={() => go('app/calculator')}
          />
          <QuickAction
            title="Lancer un MMM"
            hint="Répartition budget × 8 canaux, courbes de saturation."
            icon={<IconChart size={16} />}
            need={planAllows(plan, 'growth') ? null : 'growth'}
            gated={!planAllows(plan, 'growth')}
            onClick={() => planAllows(plan, 'growth') ? go('app/mmm') : go('pricing')}
          />
          <QuickAction
            title="Construire un media plan"
            hint="Grille mensuelle 12 mois × canaux, export CSV."
            icon={<IconCoins size={16} />}
            need={planAllows(plan, 'growth') ? null : 'growth'}
            gated={!planAllows(plan, 'growth')}
            onClick={() => planAllows(plan, 'growth') ? go('app/media-plan') : go('pricing')}
          />
        </div>

        {/* Two-pane: scenarios + mix */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-3">
          {/* Scenarios list */}
          <Card padded={false}>
            <div className="px-5 py-4 flex items-center justify-between border-b hair">
              <div className="display text-[15px] font-semibold tracking-tight">Scénarios enregistrés</div>
              <div className="text-[11px] text-mute mono uppercase">
                {scenarios.length} / {PLANS[plan].caps.scenarios === Infinity ? '∞' : PLANS[plan].caps.scenarios}
              </div>
            </div>
            {scenarios.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-mute">
                Aucun scénario. Lancez le RevOps Calculator pour en créer un.
              </div>
            )}
            {scenarios.map((s, i) => {
              const r = computeScenario(s.inputs);
              return (
                <button key={s.id}
                        onClick={() => go('app/calculator', { scenarioId: s.id })}
                        className={cn('w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-paper2/60 transition-colors',
                                      i !== scenarios.length - 1 && 'border-b hair')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 border hair inline-flex items-center justify-center text-[11px] mono uppercase text-mute">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold tracking-tight truncate">{s.name}</div>
                      <div className="text-[11.5px] text-mute mono">{new Date(s.updatedAt).toLocaleDateString('fr-CH')} · {s.inputs.leadsMois} leads/mois</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="display text-[18px] font-semibold tracking-tight num text-bad">{fmtCHF(r.totalLeak)}</div>
                    <div className="text-[11px] text-mute mono uppercase">FUITE /MOIS</div>
                  </div>
                </button>
              );
            })}
          </Card>

          {/* Mix snapshot */}
          <Card padded={false}>
            <div className="px-5 py-4 flex items-center justify-between border-b hair">
              <div className="display text-[15px] font-semibold tracking-tight">Allocation média actuelle</div>
              {!planAllows(plan, 'growth') ? (
                <Badge tone="line" className="mono"><IconLock size={10}/> GROWTH</Badge>
              ) : (
                <button onClick={() => go('app/mmm')} className="text-[12px] text-mute hover:text-ink underline underline-offset-4 decoration-line">
                  Ouvrir le MMM →
                </button>
              )}
            </div>
            <div className="p-5 space-y-2.5">
              {mmm.perChannel
                .slice()
                .sort((a, b) => b.spend - a.spend)
                .map(c => {
                  const pct = mmm.totalSpend > 0 ? c.spend / mmm.totalSpend : 0;
                  return (
                    <div key={c.id} className="grid grid-cols-[1fr_60px_46px] items-center gap-3">
                      <div className="text-[12.5px] tracking-tight truncate flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{background: c.hue}} />
                        {c.name}
                      </div>
                      <div className="h-1.5 bg-line2 relative overflow-hidden">
                        <div className="h-full bg-ink" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <div className="text-[12px] text-mute mono num text-right">{fmtPct(pct, 0)}</div>
                    </div>
                  );
                })}
              <Divider className="my-3" />
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-mute">Total / mois</span>
                <span className="num font-semibold">{fmtCHF(mmm.totalSpend)}</span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </PageShell>
  );
}

Object.assign(window, { DashboardScreen });

// ─── RevOps Score hero ──────────────────────────────────────────────────
// Big circular score gauge + tier + weakest axes + CTA.
// Renders a friendly empty-state if maturity wasn't filled.
function RevOpsScoreHero({ score, tierMeta, weakest, profile, go }) {
  const answered = score.dimensions.some(d => Number.isFinite(d.value));

  return (
    <Card padded={false} className="mb-3">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_auto]">
        {/* Gauge */}
        <div className="p-6 lg:p-7 border-b lg:border-b-0 lg:border-r hair flex items-center gap-5">
          <ScoreRing value={answered ? score.score : 0} tone={answered ? tierMeta.tone : 'mute'} />
          <div className="min-w-0">
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">RevOps Score</div>
            <div className="display text-[40px] font-bold tracking-[-0.025em] leading-none mt-1 num">
              {answered ? <AnimNum value={score.score} format={fmtNum} /> : <span className="text-mute">—</span>}
              <span className="text-mute text-[15px] font-normal num"> /100</span>
            </div>
            {answered ? (
              <div className="mt-2">
                <Badge tone={tierMeta.tone} className="mono">{tierMeta.label.toUpperCase()} · {tierMeta.band}</Badge>
              </div>
            ) : (
              <div className="text-[11.5px] text-mute mt-2">Non évalué</div>
            )}
          </div>
        </div>

        {/* Axes + narrative */}
        <div className="p-6 lg:p-7 border-b lg:border-b-0 lg:border-r hair">
          {answered ? (
            <>
              <div className="text-[13.5px] text-ink tracking-tight leading-snug max-w-[560px]">
                {tierMeta.hint}
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {score.dimensions.map(d => (
                  <div key={d.id} className="flex flex-col gap-1.5">
                    <div className="text-[11.5px] text-ink tracking-tight leading-tight">{d.label}</div>
                    <div className="flex items-center gap-1.5">
                      {[0,1,2,3].map(i => (
                        <span key={i} className={cn('w-2 h-3',
                          Number.isFinite(d.value) && i < d.value ? 'bg-accent' : 'bg-line2')} />
                      ))}
                      <span className="mono text-[10px] text-mute uppercase tracking-[0.06em] num ml-1">
                        {Number.isFinite(d.value) ? `${d.value}/4` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {weakest.length > 0 && (
                <div className="mt-4 text-[11.5px] text-mute leading-snug">
                  <span className="mono uppercase tracking-[0.06em] text-accent">Axe(s) prioritaire(s) ·</span>{' '}
                  {weakest.map(d => d.label).join(' · ')}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col justify-center">
              <div className="display text-[18px] font-semibold tracking-tight">
                Évaluez votre maturité RevOps en 1 minute.
              </div>
              <div className="text-[12.5px] text-mute mt-1.5 leading-snug max-w-[440px]">
                Six axes — données, opérations leads, attribution, alignement, stack, pilotage —
                pour calibrer vos recommandations et débloquer le potentiel de récupération.
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-6 lg:p-7 flex flex-col gap-2 justify-center min-w-[200px]">
          <Button variant={answered ? 'ghost' : 'accent'} size="md"
                  onClick={() => go('app/onboarding')}>
            {answered ? 'Refaire l\'évaluation' : 'Commencer l\'évaluation'}
          </Button>
          {answered && (
            <Button variant="quiet" size="sm"
                    onClick={() => go('app/calculator')}>
              Voir l'impact sur le calculator →
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Circular SVG ring — color-tinted by tone token (uses CSS vars from Tailwind config).
function ScoreRing({ value, tone = 'accent', size = 88 }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 100);
  const dash = (v / 100) * c;
  const toneClass = tone === 'ok' ? 'text-ok'
                  : tone === 'warn' ? 'text-warn'
                  : tone === 'bad' ? 'text-bad'
                  : tone === 'mute' ? 'text-mute'
                  : 'text-accent';
  return (
    <div className={cn('relative shrink-0', toneClass)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="9"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 480ms cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="display text-[20px] font-bold tracking-tight num">{Math.round(v)}</div>
      </div>
    </div>
  );
}
