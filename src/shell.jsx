// App shell: left sidebar nav (expert), footer, page wrapper, gated feature notice
const APP_NAME = 'RevOps Calculator';

function PupsicMark({ size = 18, className, showTagline = true, compact = false }) {
  const badge = Math.round(size * 1.35);
  const emblemSrc = (typeof window !== 'undefined' && window.__resources && window.__resources.popsicEmblem)
    || 'https://assets.kainjoo.com/wp-content/uploads/sites/40/2025/05/emblem-popsic-white.png';
  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
        <span className="inline-flex items-center justify-center bg-accent"
              style={{ width: badge, height: badge, borderRadius: 6 }}>
          <img src={emblemSrc} alt=""
               style={{ width: badge * 0.72, height: badge * 0.72, objectFit: 'contain' }} />
        </span>
        <span className="mono uppercase font-semibold tracking-[0.04em] text-ink"
              style={{ fontSize: Math.max(10, Math.round(size * 0.62)) }}>
          {APP_NAME}
        </span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <span className="inline-flex items-center justify-center bg-accent"
            style={{ width: badge, height: badge, borderRadius: 6 }}>
        <img src={emblemSrc} alt=""
             style={{ width: badge * 0.72, height: badge * 0.72, objectFit: 'contain' }} />
      </span>
      {showTagline && (
        <span className="mono uppercase font-semibold tracking-[0.04em] text-ink"
              style={{ fontSize: Math.max(10, Math.round(size * 0.62)) }}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}

function Footer() {
  return (
    <footer className="border-t hair mt-auto">
      <div className="px-6 lg:px-10 h-11 flex items-center justify-between gap-3 text-[11px] text-mute">
        <div className="mono uppercase">© Pupsic · Morges, Suisse</div>
        <div className="mono uppercase">RevOps · MMM · Media Plan</div>
      </div>
    </footer>
  );
}

function DemoBanner() {
  return (
    <div className="bg-ink text-paper text-[11px] tracking-[0.06em] uppercase font-medium">
      <div className="px-6 lg:px-10 h-8 flex items-center justify-between">
        <span className="mono">MODE DÉMO · données fictives, aucun paiement réel.</span>
        <span className="mono opacity-60 hidden sm:inline">prototype</span>
      </div>
    </div>
  );
}

// ── Left sidebar nav (expert mode) ────────────────────────────────────────
function Sidebar({ user, plan, currentScreen, go, logout, setMode }) {
  const groups = [
    { label: null,           items: [
      { id: 'app/dashboard',  label: 'Dashboard', icon: <IconGrid size={14} /> },
    ]},
    { label: 'Acquisition',  items: [
      { id: 'app/mmm',        label: 'MMM',         icon: <IconTrending size={14} />, need: 'growth' },
      { id: 'app/media-plan', label: 'Media Plan',  icon: <IconCalendar size={14} />, need: 'growth' },
    ]},
    { label: 'Customer',     items: [
      { id: 'app/rfm',        label: 'RFM',         icon: <IconUsers size={14} />,    need: 'growth' },
      { id: 'app/calculator', label: 'Leak Calc',   icon: <IconCoins size={14} /> },
    ]},
    { label: 'Forecast',     items: [
      { id: 'app/simulator',  label: 'Simulator',   icon: <IconChart size={14} />,    need: 'growth' },
    ]},
  ];
  const flipToSimple = setMode || (typeof window !== 'undefined' ? window.__pupsicSetMode : null);

  const [menuOpen, setMenuOpen] = useState(false);
  const popRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // Live connections count (read directly from localStorage so it updates per render)
  let connectionCount = 0;
  try { connectionCount = Object.keys(JSON.parse(localStorage.getItem('pupsic_connections') || '{}')).length; } catch {}

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-paper border-r hair flex flex-col z-30">
      {/* Brand */}
      <div className="px-5 pt-6 pb-7 border-b hair">
        <button onClick={() => go('app/dashboard')} className="-ml-0.5">
          <PupsicMark size={20} compact />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
        {groups.map((g, i) => (
          <div key={i}>
            {g.label && (
              <div className="px-2 mb-1.5 mono text-[9px] uppercase tracking-[0.10em] text-mute/70">
                {g.label}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map(it => {
                const gated = it.need && !planAllows(plan, it.need);
                const active = currentScreen === it.id;
                return (
                  <button key={it.id} onClick={() => go(it.id)}
                          className={cn('w-full h-8 px-2 inline-flex items-center gap-2 text-[12.5px] tracking-tight transition-colors text-left',
                                        active ? 'bg-paper2 text-ink' : 'text-mute hover:text-ink hover:bg-paper2/50')}>
                    <span className={cn(active ? 'text-accent' : 'text-mute/80')}>{it.icon}</span>
                    <span className="flex-1">{it.label}</span>
                    {gated && <IconLock size={10} className="text-mute/60" />}
                    {active && <span className="w-1 h-1 rounded-full bg-accent" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Mode toggle */}
      {flipToSimple && (
        <div className="px-3 pb-2">
          <button onClick={() => { flipToSimple('simple'); go('app/plan'); }}
                  className="w-full h-8 px-2 inline-flex items-center gap-2 text-[11.5px] text-mute hover:text-ink hover:bg-paper2/50 tracking-tight text-left transition-colors">
            <IconArrowLeft size={12} />
            <span>Mode simple</span>
          </button>
        </div>
      )}

      {/* Trials shortcut */}
      <div className="px-3 pb-2 border-t hair pt-3">
        <button onClick={() => window.__pupsicOpenTrials && window.__pupsicOpenTrials(true)}
                className="w-full h-8 px-2 inline-flex items-center gap-2 text-[12px] text-ink hover:bg-paper2 tracking-tight text-left transition-colors">
          <IconFolder size={12} className="text-accent" />
          <span className="flex-1">Mes essais</span>
          <IconArrowRight size={11} className="text-mute" />
        </button>
        <button onClick={() => go('app/integrations')}
                className="w-full h-8 px-2 inline-flex items-center gap-2 text-[12px] text-ink hover:bg-paper2 tracking-tight text-left transition-colors mt-0.5">
          <IconLink size={12} className="text-accent" />
          <span className="flex-1">Connexions</span>
          <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">{connectionCount}</span>
        </button>
      </div>

      {/* User menu (bottom) */}
      <div className="border-t hair px-3 py-3 relative" ref={popRef}>
        <button onClick={() => setMenuOpen(o => !o)}
                className={cn('w-full px-2 py-1.5 inline-flex items-center gap-2.5 transition-colors hover:bg-paper2/50',
                              menuOpen && 'bg-paper2/60')}>
          <span className="w-7 h-7 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[11px] font-semibold uppercase shrink-0">
            {(user?.name || '?').slice(0, 1)}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12.5px] tracking-tight text-ink truncate">{user?.name || 'Utilisateur'}</span>
            <span className="block mono text-[9.5px] uppercase tracking-[0.06em] text-mute mt-0.5">
              {PLANS[plan]?.name || 'Starter'}
            </span>
          </span>
          <IconChevron size={11} className={cn('text-mute transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-[calc(100%-0.5rem)] left-3 right-3 bg-paper border hair shadow-lg py-1 z-40">
            <button onClick={() => { setMenuOpen(false); go('app/account'); }}
                    className="w-full px-3 py-2 text-left text-[12.5px] tracking-tight text-ink hover:bg-paper2 inline-flex items-center gap-2">
              <IconUser size={12} className="text-mute" />
              <span>Mon compte</span>
            </button>
            <div className="px-3 py-2 border-t hair">
              <div className="mono text-[9.5px] uppercase tracking-[0.06em] text-mute">Plan actuel</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[12px] font-semibold tracking-tight text-ink">{PLANS[plan]?.name || 'Starter'}</span>
                <button onClick={() => { setMenuOpen(false); go('pricing'); }}
                        className="text-[10.5px] text-accent hover:underline mono uppercase tracking-[0.06em]">
                  Changer →
                </button>
              </div>
            </div>
            <button onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full px-3 py-2 text-left text-[12.5px] tracking-tight text-bad hover:bg-paper2 inline-flex items-center gap-2 border-t hair">
              <IconLogout size={12} />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Backwards-compat alias for any existing imports
const AppNav = Sidebar;

// Outer page wrapper used by ALL screens
function PageShell({ user, plan, currentScreen, go, logout, setMode, children, chrome = true }) {
  return (
    <div className="min-h-full flex">
      {chrome && <Sidebar user={user} plan={plan} currentScreen={currentScreen} go={go} logout={logout} setMode={setMode} />}
      <div className={cn('flex flex-col min-h-screen flex-1 min-w-0', chrome && 'ml-[220px]')}>
        <DemoBanner />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
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

Object.assign(window, { PupsicMark, Footer, DemoBanner, AppNav, Sidebar, PageShell, GatedPanel, APP_NAME });
