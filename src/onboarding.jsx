// Onboarding — 5-step wizard. Collects: industry, country, lifecycle, size band, revenue band,
// sales team size, current RevOps spend, priority, and a 6-axis maturity assessment.
// Routes to /app/calculator with the profile + RevOps Score pre-filled.

function OBProgress({ step, total = 5 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cn('h-1 w-10 transition-colors',
          i < step ? 'bg-accent' : i === step ? 'bg-ink' : 'bg-line2')} />
      ))}
      <span className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute ml-3">
        Étape {step + 1} / {total}
      </span>
    </div>
  );
}

function OBOptionCard({ active, onClick, children, className }) {
  return (
    <button type="button" onClick={onClick}
            className={cn('text-left p-4 border transition-colors min-h-[88px] flex flex-col justify-between',
                          active ? 'border-ink bg-paper2/70' : 'hair hover:border-ink/40 hover:bg-paper2/40',
                          className)}>
      {children}
    </button>
  );
}

function OBShell({ user, step, total, onBack, onSkip, children, title, subtitle, primary, primaryDisabled, primaryLabel = 'Continuer', secondary, secondaryLabel = 'Retour' }) {
  return (
    <div className="min-h-full flex flex-col">
      <DemoBanner />
      <header className="border-b hair bg-paper">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <PupsicMark size={18} />
          <div className="text-[12px] text-mute">
            Configuration · <span className="text-ink">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex">
        <div className="w-full max-w-[860px] mx-auto px-6 lg:px-10 py-12 lg:py-16 flex flex-col">
          <OBProgress step={step} total={total} />

          <div className="mt-10 mb-2">
            <Badge tone="line" className="mono mb-4">PUPSIC · ONBOARDING</Badge>
            <h1 className="display text-[40px] lg:text-[48px] font-bold tracking-[-0.025em] leading-[1.02]">
              {title}
            </h1>
            {subtitle && <p className="text-[14.5px] text-mute mt-3 max-w-[600px]">{subtitle}</p>}
          </div>

          <div className="mt-8 flex-1">{children}</div>

          <div className="mt-10 pt-6 border-t hair flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {step > 0 ? (
                <Button variant="ghost" icon={<IconArrowLeft size={13}/>} onClick={onBack}>{secondaryLabel}</Button>
              ) : <span />}
              {onSkip && (
                <button onClick={onSkip} className="text-[12px] text-mute hover:text-ink underline underline-offset-4 decoration-line">
                  Sauter pour l'instant
                </button>
              )}
            </div>
            <Button variant="primary" size="lg" iconRight={<IconArrowRight size={13}/>}
                    onClick={primary} disabled={primaryDisabled}>
              {primaryLabel}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function OnboardingScreen({ user, profile, setProfile, go }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({
    industry: profile?.industry || null,
    country: profile?.country || 'CH',
    lifecycle: profile?.lifecycle || null,
    sizeBand: profile?.sizeBand || null,
    revenueBand: profile?.revenueBand || null,
    caAnnuel: profile?.caAnnuel || null,
    salesTeam: profile?.salesTeam || null,
    currentRevops: profile?.currentRevops || 0,
    priority: profile?.priority || null,
    maturity: { ...EMPTY_MATURITY, ...(profile?.maturity || {}) },
  }));
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const next = () => setStep(s => Math.min(4, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const sizeBand = SIZE_BANDS.find(b => b.id === draft.sizeBand);
  const revenueBand = REVENUE_BANDS.find(b => b.id === draft.revenueBand);

  // When revenue band is picked, derive CA midpoint as default
  useEffect(() => {
    if (revenueBand && !draft.caAnnuel) set('caAnnuel', revenueBand.midpoint);
  }, [revenueBand]);
  // When size band picked, derive salesTeam default
  useEffect(() => {
    if (sizeBand && !draft.salesTeam) set('salesTeam', sizeBand.benchTeam);
  }, [sizeBand]);

  const finish = () => {
    const ind = INDUSTRIES[draft.industry] || INDUSTRIES.saas_b2b;
    const finalProfile = {
      ...draft,
      onboardingCompleted: true,
    };
    setProfile(finalProfile);
    go('app/plan');
  };

  // ── Step 0: Industry ─────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <OBShell user={user} step={0} total={5}
        title="Quelle est votre industrie ?"
        subtitle="Pupsic calibre vos benchmarks de conversion, closing et panier moyen à partir de votre verticale."
        primary={next} primaryDisabled={!draft.industry}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {INDUSTRY_ORDER.map(id => {
            const ind = INDUSTRIES[id];
            const active = draft.industry === id;
            return (
              <OBOptionCard key={id} active={active} onClick={() => set('industry', id)}>
                <div className="flex items-center justify-between">
                  <div className="display text-[15px] font-semibold tracking-tight">{ind.name}</div>
                  {active && <IconCheck size={14} className="text-accent" />}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="mono uppercase text-mute text-[9.5px] tracking-[0.06em]">Conv. médian</div>
                    <div className="num font-semibold mt-0.5">{fmtPct(ind.conv, 0)}</div>
                  </div>
                  <div>
                    <div className="mono uppercase text-mute text-[9.5px] tracking-[0.06em]">Closing</div>
                    <div className="num font-semibold mt-0.5">{fmtPct(ind.closing, 0)}</div>
                  </div>
                  <div>
                    <div className="mono uppercase text-mute text-[9.5px] tracking-[0.06em]">Panier</div>
                    <div className="num font-semibold mt-0.5">{fmtCHFShort(ind.panier)}</div>
                  </div>
                </div>
              </OBOptionCard>
            );
          })}
        </div>
      </OBShell>
    );
  }

  // ── Step 1: Country + Size + Revenue ─────────────────────────────────────
  if (step === 1) {
    const ready = draft.country && draft.lifecycle && draft.sizeBand && draft.revenueBand;
    return (
      <OBShell user={user} step={1} total={5}
        title="Profil entreprise."
        subtitle="Pays, stade de maturité, taille — ces signaux calibrent vos benchmarks et votre CAC cible."
        primary={next} primaryDisabled={!ready} onBack={back}>
        <div className="space-y-7">

          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Pays principal d'activité</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {COUNTRIES.map(c => (
                <OBOptionCard key={c.id} active={draft.country === c.id} onClick={() => set('country', c.id)} className="min-h-0 py-3">
                  <div className="text-[20px] leading-none mb-1.5">{c.flag}</div>
                  <div className="text-[12.5px] font-semibold tracking-tight">{c.name}</div>
                  <div className="mono text-[9.5px] text-mute uppercase tracking-[0.06em] mt-1.5">
                    CAC ×{c.cacIndex.toFixed(2).replace('.', ',')}
                  </div>
                </OBOptionCard>
              ))}
            </div>
          </div>

          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Stade de l'entreprise (lifecycle)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {LIFECYCLE_ORDER.map(id => {
                const lc = LIFECYCLES[id];
                const active = draft.lifecycle === id;
                return (
                  <OBOptionCard key={id} active={active} onClick={() => set('lifecycle', id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="display text-[20px] leading-none text-accent">{lc.icon}</span>
                        <div>
                          <div className="display text-[15px] font-semibold tracking-tight">{lc.name}</div>
                          <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">{lc.short}</div>
                        </div>
                      </div>
                      {active && <IconCheck size={14} className="text-accent" />}
                    </div>
                    <div className="text-[11.5px] text-mute mt-2 leading-snug">{lc.pitch}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10.5px]">
                      <div>
                        <div className="mono uppercase text-mute text-[9px] tracking-[0.06em]">Réponse</div>
                        <div className="num font-semibold mt-0.5">&lt;{lc.responseTarget} min</div>
                      </div>
                      <div>
                        <div className="mono uppercase text-mute text-[9px] tracking-[0.06em]">LTV:CAC</div>
                        <div className="num font-semibold mt-0.5">≥{lc.ltvCacTarget.toFixed(1).replace('.', ',')}</div>
                      </div>
                      <div>
                        <div className="mono uppercase text-mute text-[9px] tracking-[0.06em]">Payback</div>
                        <div className="num font-semibold mt-0.5">≤{lc.cacPaybackTargetMo} mo</div>
                      </div>
                    </div>
                  </OBOptionCard>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Taille de l'entreprise (effectif)</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {SIZE_BANDS.map(b => (
                <OBOptionCard key={b.id} active={draft.sizeBand === b.id} onClick={() => set('sizeBand', b.id)} className="min-h-0 py-3">
                  <div className="display text-[18px] font-bold tracking-tight num">{b.label}</div>
                  <div className="text-[11px] text-mute mt-0.5 leading-tight">{b.name}</div>
                </OBOptionCard>
              ))}
            </div>
          </div>

          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Chiffre d'affaires annuel (last 12m)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {REVENUE_BANDS.map(b => (
                <OBOptionCard key={b.id} active={draft.revenueBand === b.id} onClick={() => { set('revenueBand', b.id); set('caAnnuel', b.midpoint); }} className="min-h-0 py-3">
                  <div className="display text-[16px] font-bold tracking-tight">{b.label}</div>
                  <div className="text-[11px] text-mute mt-0.5">~ {fmtCHFShort(b.midpoint)} médiane</div>
                </OBOptionCard>
              ))}
            </div>
          </div>

        </div>
      </OBShell>
    );
  }

  // ── Step 2: Team + RevOps spend + Priority ──────────────────────────────
  if (step === 2) {
    const ind = INDUSTRIES[draft.industry] || INDUSTRIES.saas_b2b;
    const monthlyCA = (draft.caAnnuel || 0) / 12;
    return (
      <OBShell user={user} step={2} total={5}
        title="Votre opération commerciale."
        subtitle="Combien d'équipe, et combien dépensez-vous déjà en RevOps / commercial ?"
        primary={next} primaryDisabled={!draft.salesTeam || !draft.priority} onBack={back}>
        <div className="space-y-7">

          <Card padded={false}>
            <div className="px-5 py-4 border-b hair">
              <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Équipe commerciale</div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
              <FieldSlider label="Nombre de commerciaux (vente + SDR)"
                value={draft.salesTeam || sizeBand?.benchTeam || 4}
                min={1} max={60} step={1}
                format={(v) => `${v} pers.`}
                hint={sizeBand ? `Benchmark ${sizeBand.label} employés : ~${sizeBand.benchTeam} commerciaux` : 'Sélectionnez une taille à l\'étape précédente.'}
                benchmark={sizeBand?.benchTeam}
                benchmarkLabel="Benchmark"
                onChange={(v) => set('salesTeam', v)} />
              <div className="text-right">
                <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">Charge / commercial</div>
                <div className="display text-[24px] font-semibold tracking-tight num mt-1">
                  {Math.round((monthlyCA / ind.panier / ind.conv / ind.closing) / Math.max(1, draft.salesTeam || 1))}
                  <span className="text-mute text-[11px] font-normal"> leads / mois</span>
                </div>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-4 border-b hair">
              <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Investissement RevOps actuel</div>
            </div>
            <div className="p-5">
              <FieldSlider label="Combien dépensez-vous déjà par mois en outils + agence RevOps ?"
                value={draft.currentRevops || 0}
                min={0} max={20000} step={100}
                format={(v) => fmtCHF(v)}
                hint="Inclut Klaviyo, HubSpot, Salesforce, agences, freelances — 0 si rien encore."
                onChange={(v) => set('currentRevops', v)} />
              <div className="mt-3 text-[11.5px] text-mute">
                Représente <span className="num text-ink font-semibold">{monthlyCA > 0 ? fmtPct((draft.currentRevops || 0) / monthlyCA, 1) : '—'}</span> de votre CA mensuel.
                Médian SME suisse : 0,5 – 2%.
              </div>
            </div>
          </Card>

          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Priorité ressentie</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRIORITIES.map(p => (
                <OBOptionCard key={p.id} active={draft.priority === p.id} onClick={() => set('priority', p.id)}>
                  <div className="display text-[14.5px] font-semibold tracking-tight flex items-center justify-between">
                    {p.label}
                    {draft.priority === p.id && <IconCheck size={13} className="text-accent" />}
                  </div>
                  <div className="text-[11.5px] text-mute mt-1.5 leading-snug">{p.hint}</div>
                </OBOptionCard>
              ))}
            </div>
          </div>

        </div>
      </OBShell>
    );
  }

  // ── Step 3: RevOps Maturity assessment ───────────────────────────────────
  if (step === 3) {
    const answered = MATURITY_DIMENSIONS.every(d => Number.isFinite(draft.maturity?.[d.id]));
    const setM = (id, value) => setDraft(d => ({ ...d, maturity: { ...d.maturity, [id]: value } }));
    const live = computeRevopsScore(draft.maturity);
    const tierMeta = MATURITY_TIERS[live.tier];
    return (
      <OBShell user={user} step={3} total={5}
        title="Maturité RevOps."
        subtitle="Six axes, une minute. Pupsic calcule votre RevOps Score et ajuste les recommandations à votre stade."
        primary={next} primaryDisabled={!answered} onBack={back}>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0 border hair bg-paper2/40 mb-7">
          <div className="p-5 border-b md:border-b-0 md:border-r hair">
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">RevOps Score · live</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="display text-[56px] font-bold tracking-[-0.025em] leading-none text-accent num">
                <AnimNum value={live.score} format={fmtNum} />
              </span>
              <span className="text-mute text-[15px] num">/100</span>
            </div>
            <div className="mt-2">
              <Badge tone={tierMeta.tone} className="mono">{tierMeta.label.toUpperCase()} · {tierMeta.band}</Badge>
            </div>
          </div>
          <div className="p-5">
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute mb-3">Score par axe</div>
            <div className="space-y-2">
              {live.dimensions.map(d => (
                <div key={d.id} className="grid grid-cols-[140px_1fr_36px] gap-3 items-center">
                  <div className="text-[11.5px] text-ink font-medium tracking-tight truncate">{d.label}</div>
                  <div className="h-1.5 bg-line2 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
                         style={{ width: `${(Number.isFinite(d.value) ? d.value : 0) / 4 * 100}%` }} />
                  </div>
                  <div className="mono text-[10.5px] text-mute uppercase tracking-[0.06em] text-right num">
                    {Number.isFinite(d.value) ? `${d.value}/4` : '—'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11.5px] text-mute mt-3 leading-snug">{tierMeta.hint}</div>
          </div>
        </div>

        <div className="space-y-7">
          {MATURITY_DIMENSIONS.map(d => (
            <div key={d.id}>
              <div className="flex items-baseline justify-between mb-3 gap-3">
                <div>
                  <div className="display text-[15px] font-semibold tracking-tight">{d.label}</div>
                  <div className="text-[11.5px] text-mute mt-0.5">{d.hint}</div>
                </div>
                <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute whitespace-nowrap">
                  {Number.isFinite(draft.maturity?.[d.id])
                    ? <span className="text-accent num">{draft.maturity[d.id]}/4</span>
                    : '—'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {d.options.map(opt => {
                  const active = draft.maturity?.[d.id] === opt.value;
                  return (
                    <OBOptionCard key={opt.value} active={active} onClick={() => setM(d.id, opt.value)}
                                   className="min-h-[96px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="display text-[13px] font-semibold tracking-tight leading-tight">{opt.label}</div>
                        <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute num shrink-0">{opt.value}/4</div>
                      </div>
                      <div className="text-[10.5px] text-mute mt-2 leading-snug">{opt.caption}</div>
                    </OBOptionCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </OBShell>
    );
  }

  // ── Step 4: Summary ──────────────────────────────────────────────────────
  const ind = INDUSTRIES[draft.industry];
  const country = COUNTRIES.find(c => c.id === draft.country);
  const lc = LIFECYCLES[draft.lifecycle];
  const priority = PRIORITIES.find(p => p.id === draft.priority);
  const score = computeRevopsScore(draft.maturity);
  const tierMeta = MATURITY_TIERS[score.tier];
  const monthlyCA = (draft.caAnnuel || 0) / 12;
  const rows = [
    { label: 'Industrie',           value: ind?.name },
    { label: 'Pays',                value: country ? `${country.name} · CAC ×${country.cacIndex.toFixed(2).replace('.', ',')}` : null },
    { label: 'Stade (lifecycle)',   value: lc ? `${lc.name} · ${lc.short} · cible LTV:CAC ≥ ${lc.ltvCacTarget.toFixed(1).replace('.', ',')}` : null },
    { label: 'Taille entreprise',   value: sizeBand?.label + ' employés · ' + sizeBand?.name },
    { label: 'Chiffre d\'affaires', value: fmtCHF(draft.caAnnuel) + ' / an · ' + fmtCHF(monthlyCA) + ' / mois' },
    { label: 'Équipe commerciale',  value: draft.salesTeam + ' personne(s)' },
    { label: 'RevOps actuel',       value: fmtCHF(draft.currentRevops) + ' / mois' },
    { label: 'Priorité',            value: priority?.label },
    { label: 'RevOps Score',        value: `${score.score}/100 · ${tierMeta.label} (${tierMeta.band})` },
  ];

  return (
    <OBShell user={user} step={4} total={5}
      title="Récapitulatif."
      subtitle="Vérifiez et lancez votre diagnostic. Vous pourrez ajuster chaque paramètre à tout moment depuis le Calculator."
      primary={finish} primaryLabel="Lancer mon diagnostic" onBack={back}>
      <Card padded={false}>
        <div className="divide-y hair">
          {rows.map((r, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-[180px_1fr] items-center">
              <div className="mono text-[10.5px] uppercase tracking-[0.06em] text-mute">{r.label}</div>
              <div className="text-[14px] font-semibold tracking-tight">{r.value || <span className="text-mute font-normal">—</span>}</div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-4 text-[12px] text-mute">
        Pupsic utilise vos réponses pour comparer vos métriques à la médiane <span className="text-ink font-semibold">{ind?.name}</span> ajustée <span className="text-ink font-semibold">{lc?.name}</span> en <span className="text-ink font-semibold">{country?.name}</span>, et calculer votre CAC, LTV et potentiel de récupération.
      </div>
    </OBShell>
  );
}

Object.assign(window, { OnboardingScreen });
