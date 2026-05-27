// App shell: top nav (in-app), footer, page wrapper, gated feature notice
function PupsicMark({ size = 18, className }) {
  const badge = Math.round(size * 1.35);
  const emblemSrc = (typeof window !== 'undefined' && window.__resources && window.__resources.popsicEmblem)
    || 'https://assets.kainjoo.com/wp-content/uploads/sites/40/2025/05/emblem-popsic-white.png';
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <span className="inline-flex items-center justify-center bg-accent"
            style={{ width: badge, height: badge, borderRadius: 6 }}>
        <img src={emblemSrc}
             alt=""
             style={{ width: badge * 0.72, height: badge * 0.72, objectFit: 'contain' }} />
      </span>
      <span className="display font-bold tracking-tight" style={{ fontSize: size, letterSpacing: '-0.02em' }}>Pupsic</span>
    </span>
  );
}

function Footer() {
  return (
    <footer className="border-t hair mt-auto">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-12 flex items-center justify-between gap-3 text-[11px] text-mute">
        <div className="mono uppercase">© Pupsic · Morges, Suisse</div>
        <div className="mono uppercase">RevOps · MMM · Media Plan</div>
      </div>
    </footer>
  );
}

function DemoBanner() {
  return (
    <div className="bg-ink text-paper text-[11px] tracking-[0.06em] uppercase font-medium">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-8 flex items-center justify-between">
        <span className="mono">MODE DÉMO · données fictives, aucun paiement réel.</span>
        <span className="mono opacity-60 hidden sm:inline">Pupsic · prototype</span>
      </div>
    </div>
  );
}

function AppNav({ user, plan, currentScreen, go, logout }) {
  const items = [
    { id: 'app/dashboard',  label: 'Dashboard',  icon: <IconGrid size={14} /> },
    { id: 'app/calculator', label: 'Calculator', icon: <IconCalculator size={14} />, need: 'starter' },
    { id: 'app/mmm',        label: 'MMM',         icon: <IconChart size={14} />, need: 'growth' },
    { id: 'app/media-plan', label: 'Media plan',  icon: <IconCoins size={14} />, need: 'growth' },
  ];
  return (
    <header className="border-b hair bg-paper sticky top-0 z-30">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <button onClick={() => go('app/dashboard')} className="-ml-1">
            <PupsicMark size={18} />
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {items.map(it => {
              const gated = it.need && !planAllows(plan, it.need);
              const active = currentScreen === it.id;
              return (
                <button key={it.id} onClick={() => go(it.id)}
                        className={cn('h-9 px-3 inline-flex items-center gap-2 text-[13px] tracking-tight transition-colors',
                                      active ? 'text-ink' : 'text-mute hover:text-ink')}>
                  {it.icon}
                  <span>{it.label}</span>
                  {gated && <IconLock size={11} className="text-mute/70" />}
                  {active && <span className="ml-1 inline-block w-1 h-1 rounded-full bg-accent" />}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="line" className="mono">
            <span className="pupdot" style={{width:6, height:6, boxShadow:'none'}} />
            PLAN&nbsp;· {PLANS[plan].name.toUpperCase()}
          </Badge>
          <button onClick={() => go('app/account')}
                  className="h-9 inline-flex items-center gap-2 px-2.5 text-[13px] text-ink hover:bg-ink/[0.04]">
            <span className="w-6 h-6 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[11px] font-semibold uppercase">
              {(user?.name || '?').slice(0,1)}
            </span>
            <span className="hidden sm:inline tracking-tight">{user?.name}</span>
          </button>
          <button onClick={logout} className="h-9 w-9 inline-flex items-center justify-center text-mute hover:text-ink hover:bg-ink/[0.04]"
                  title="Se déconnecter">
            <IconLogout size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

// Outer page wrapper used by ALL screens
function PageShell({ user, plan, currentScreen, go, logout, children, chrome = true }) {
  return (
    <div className="min-h-full flex flex-col">
      <DemoBanner />
      {chrome && <AppNav user={user} plan={plan} currentScreen={currentScreen} go={go} logout={logout} />}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Gated-feature placeholder
function GatedPanel({ need, plan, onUpgrade, title, copy }) {
  const required = PLANS[need];
  return (
    <Card className="text-center py-14">
      <div className="w-12 h-12 mx-auto inline-flex items-center justify-center border hair">
        <IconLock size={18} />
      </div>
      <h3 className="display text-2xl font-semibold mt-4">{title || 'Fonctionnalité verrouillée'}</h3>
      <p className="text-[13px] text-mute mt-1 max-w-md mx-auto">
        {copy || `Disponible sur le plan ${required.name} et supérieur.`}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button variant="primary" onClick={onUpgrade} iconRight={<IconArrowRight size={14} />}>
          Passer au plan {required.name}
        </Button>
        <Badge tone="line" className="mono">CHF {required.priceCHF}/MOIS</Badge>
      </div>
    </Card>
  );
}

Object.assign(window, { PupsicMark, Footer, DemoBanner, AppNav, PageShell, GatedPanel });
