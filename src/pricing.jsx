// Pricing screen + mock Stripe checkout modal
function PricingScreen({ user, plan, go, setPlan, embedded = false }) {
  const [picking, setPicking] = useState(null); // tier id
  const [phase, setPhase] = useState('idle');   // idle | processing | success
  const { toast } = useToast();

  const choose = (id) => {
    setPicking(id);
    setPhase('processing');
    setTimeout(() => setPhase('success'), 2000);
  };
  const finish = () => {
    setPlan(picking);
    setPicking(null);
    setPhase('idle');
    toast(`Plan ${PLANS[picking].name} activé`, { tone: 'accent' });
    if (user) go('app/dashboard');
  };

  const Body = (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
        <div>
          <Badge tone="line" className="mono mb-4">TARIFS</Badge>
          <h1 className="display text-[52px] leading-[1.02] font-bold tracking-[-0.025em] max-w-[720px]">
            Un prix par étape de votre maturité RevOps.
          </h1>
          <p className="text-[15px] text-mute mt-4 max-w-[640px]">
            Du diagnostic instantané à l'optimisation continue. Annulable à tout moment, données chiffrées en Suisse.
          </p>
        </div>
        <div className="text-[12px] text-mute mono uppercase">
          <div>Tous prix HT · CHF</div>
          <div>Engagement mensuel · résiliable à 30 jours</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l hair">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const current = user && plan === id;
          return (
            <div key={id} className={cn(
              'border-r border-b hair p-7 lg:p-8 flex flex-col bg-paper relative',
              p.starred && 'bg-[#f7eeff]'
            )}>
              {p.starred && (
                <div className="absolute -top-3 left-7 inline-flex items-center gap-1.5 bg-ink text-paper text-[10px] tracking-[0.08em] uppercase font-medium px-2 h-5">
                  <IconStar size={10} /> Recommandé
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="display text-xl font-semibold tracking-tight">{p.name}</div>
                {current && <Badge tone="ink" className="mono">PLAN ACTUEL</Badge>}
              </div>
              <div className="text-[13px] text-mute mt-1">{p.pitch}</div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="display text-[56px] leading-none font-bold tracking-[-0.03em] num">CHF&nbsp;{p.priceCHF}</span>
                <span className="text-[12px] text-mute mono uppercase">/MOIS</span>
              </div>

              <ul className="mt-7 space-y-2.5 text-[13.5px] flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className={cn('mt-[3px] w-3.5 h-3.5 inline-flex items-center justify-center flex-none',
                                          p.starred && i === 0 ? 'text-accent' : 'text-ink')}>
                      <IconCheck size={13} stroke={2.2} />
                    </span>
                    <span className="tracking-tight leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button variant={p.starred ? 'accent' : 'primary'} full size="lg"
                        disabled={current}
                        onClick={() => choose(id)}
                        iconRight={current ? <IconCheck size={14} /> : <IconArrowRight size={14} />}>
                  {current ? 'Plan actuel' : `Choisir ${p.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-[12px] text-mute mono uppercase tracking-[0.04em] flex flex-wrap gap-x-8 gap-y-2">
        <span>· Paiement sécurisé Stripe (simulation en démo)</span>
        <span>· Données hébergées en Suisse</span>
        <span>· Support FR / EN / DE</span>
      </div>
    </div>
  );

  return (
    <>
      {embedded ? Body : (
        <PageShell user={user} plan={plan} currentScreen="pricing" go={go} logout={() => go('login')} chrome={!!user}>
          {!user && (
            <header className="border-b hair bg-paper">
              <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
                <button onClick={() => go('login')}><PupsicMark size={18} /></button>
                <button onClick={() => go('login')} className="text-[13px] text-mute hover:text-ink tracking-tight">Se connecter</button>
              </div>
            </header>
          )}
          {Body}
        </PageShell>
      )}

      {picking && (
        <CheckoutModal
          tier={picking}
          phase={phase}
          onClose={() => { if (phase !== 'processing') { setPicking(null); setPhase('idle'); } }}
          onDone={finish}
        />
      )}
    </>
  );
}

function CheckoutModal({ tier, phase, onClose, onDone }) {
  const p = PLANS[tier];
  return (
    <div className="fixed inset-0 z-50 bg-ink/35 fade-in flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-paper border hair slide-up">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between border-b hair">
          <div className="flex items-center gap-2">
            <span className="display font-bold tracking-tight text-[18px]">Stripe</span>
            <span className="text-mute mono text-[11px] uppercase">simulation</span>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink"><IconX size={16} /></button>
        </div>

        <div className="p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[12px] text-mute mono uppercase">Pupsic · {p.name}</div>
              <div className="display text-[28px] font-semibold tracking-tight mt-1">CHF&nbsp;{p.priceCHF}<span className="text-[14px] text-mute font-normal"> /mois</span></div>
            </div>
            <Badge tone="line" className="mono">DEMO MODE</Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <div className="h-11 px-3 border hair flex items-center gap-2 text-[13px] text-mute">
              <IconCard size={14} />
              <span className="mono">4242&nbsp;4242&nbsp;4242&nbsp;4242</span>
              <span className="ml-auto mono">12/29 · 123</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 px-3 border hair flex items-center text-[13px] text-mute">Suisse</div>
              <div className="h-11 px-3 border hair flex items-center text-[13px] text-mute mono">CHE-178.225.258</div>
            </div>
          </div>

          <div className="mt-6 min-h-[44px] flex items-center justify-center">
            {phase === 'processing' && (
              <div className="flex items-center gap-2 text-[13px] text-mute">
                <Spinner size={16} /> Traitement du paiement…
              </div>
            )}
            {phase === 'success' && (
              <div className="flex items-center gap-2 text-[13px] text-ok">
                <IconCheckCircle size={16} /> Paiement confirmé.
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            {phase === 'success' ? (
              <Button variant="primary" onClick={onDone} iconRight={<IconArrowRight size={14}/>}>Continuer</Button>
            ) : (
              <Button variant="ghost" onClick={onClose} disabled={phase === 'processing'}>Annuler</Button>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t hair text-[11px] text-mute mono uppercase">
          AUCUN PAIEMENT RÉEL — PROTOTYPE
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PricingScreen });
