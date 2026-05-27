// Account screen
function AccountScreen({ user, plan, setPlan, go, logout, scenarios }) {
  const p = PLANS[plan];
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/account" go={go} logout={logout}>
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10 py-8 lg:py-10">

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
          <div>
            <Badge tone="line" className="mono mb-3">COMPTE</Badge>
            <h1 className="display text-[36px] lg:text-[44px] font-bold tracking-[-0.025em] leading-[1.02]">
              {user?.name}.
            </h1>
            <p className="text-[14px] text-mute mt-2">{user?.email}</p>
          </div>
        </div>

        {/* Plan card */}
        <Card padded={false}>
          <div className="px-5 py-4 border-b hair flex items-center justify-between">
            <div className="display text-[15px] font-semibold tracking-tight">Abonnement</div>
            <Badge tone="ink" className="mono">ACTIF</Badge>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div>
              <div className="display text-[26px] font-semibold tracking-tight">Pupsic {p.name}</div>
              <div className="text-[13px] text-mute mt-1">{p.pitch}</div>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <span className="display text-[36px] font-semibold tracking-[-0.025em] num">CHF&nbsp;{p.priceCHF}</span>
                <span className="text-[12px] text-mute mono uppercase">/MOIS · RÉSILIABLE 30 JOURS</span>
              </div>
              <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[12.5px]">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2"><IconCheck size={12} className="text-accent"/> {f}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <Button variant="primary" full icon={<IconArrowRight size={13}/>} onClick={() => go('pricing')}>
                Changer de plan
              </Button>
              <Button variant="ghost" full onClick={() => setConfirmCancel(true)}>
                Annuler l'abonnement
              </Button>
            </div>
          </div>

          {/* Usage */}
          <div className="border-t hair grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x hair">
            <div className="p-5">
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Scénarios utilisés</div>
              <div className="display text-[22px] font-semibold tracking-tight num mt-2">
                {scenarios.length}<span className="text-mute font-normal text-[14px]"> / {p.caps.scenarios === Infinity ? '∞' : p.caps.scenarios}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">Sièges</div>
              <div className="display text-[22px] font-semibold tracking-tight num mt-2">
                1<span className="text-mute font-normal text-[14px]"> / {p.caps.seats}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-[11px] text-mute mono uppercase tracking-[0.04em]">API access</div>
              <div className="display text-[22px] font-semibold tracking-tight mt-2">
                {p.caps.api ? 'Activé' : <span className="text-mute">—</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Seats */}
        {plan === 'pro' && (
          <Card padded={false} className="mt-3">
            <div className="px-5 py-4 border-b hair flex items-center justify-between">
              <div className="display text-[15px] font-semibold tracking-tight">Sièges · 1 / 5</div>
              <Button variant="ghost" size="sm" icon={<IconPlus size={13}/>}
                      onClick={() => toast('Invitation envoyée (simulée)')}>Inviter</Button>
            </div>
            <div className="divide-y hair">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[11px] font-semibold uppercase">
                    {user?.name?.slice(0,1)}
                  </span>
                  <div>
                    <div className="text-[13px] font-medium tracking-tight">{user?.name}</div>
                    <div className="text-[11.5px] text-mute mono">{user?.email}</div>
                  </div>
                </div>
                <Badge tone="ink" className="mono">PROPRIÉTAIRE</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Danger zone via modal */}
        {confirmCancel && (
          <div className="fixed inset-0 z-50 bg-ink/35 fade-in flex items-center justify-center p-4">
            <div className="bg-paper border hair max-w-[440px] w-full slide-up">
              <div className="px-5 py-4 border-b hair flex items-center justify-between">
                <div className="display text-[16px] font-semibold tracking-tight">Annuler l'abonnement ?</div>
                <button onClick={() => setConfirmCancel(false)} className="text-mute hover:text-ink"><IconX size={16}/></button>
              </div>
              <div className="p-5 text-[13px] text-mute">
                Votre plan {p.name} restera actif jusqu'à la fin de la période en cours. Vos scénarios et plan média sont conservés 90 jours.
              </div>
              <div className="px-5 py-4 border-t hair flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Conserver</Button>
                <Button variant="danger" icon={<IconX size={13}/>}
                        onClick={() => { setConfirmCancel(false); toast('Abonnement annulé (simulé)', { tone: 'accent' }); }}>
                  Confirmer l'annulation
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}

Object.assign(window, { AccountScreen });
