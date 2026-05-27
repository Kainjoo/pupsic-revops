// Login + Signup screens
function AuthShell({ children, side }) {
  return (
    <div className="min-h-full flex flex-col">
      <DemoBanner />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="px-6 lg:px-14 py-10 flex flex-col">
          <div className="mb-12"><PupsicMark size={20} /></div>
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-[420px] mx-auto lg:mx-0">{children}</div>
          </div>
        </div>
        <div className="hidden lg:block bg-paper2 border-l hair relative overflow-hidden">
          {side}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function AuthSideArt() {
  // Two-line revenue trajectory: with vs without RevOps over 12 months.
  // Procedural so it animates in subtly on mount.
  const months = 12;
  const baseStart = 100; // CHF '000 / month
  const withStart = 100;
  // Without RevOps: slow linear creep (~0.6%/mo)
  const without = Array.from({ length: months }, (_, i) => baseStart * Math.pow(1.006, i));
  // With RevOps: stronger compounding with diminishing returns
  const withR = Array.from({ length: months }, (_, i) => {
    const t = i / (months - 1);
    return withStart * (1 + 0.65 * (1 - Math.exp(-2.4 * t)));
  });
  const yMax = Math.max(...withR) * 1.05;
  const yMin = baseStart * 0.92;
  const xy = (arr) => arr.map((v, i) => {
    const x = (i / (months - 1)) * 100;
    const y = 60 - ((v - yMin) / (yMax - yMin)) * 60;
    return [x, y];
  });
  const pWithout = xy(without);
  const pWith    = xy(withR);
  const path = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const liftArea = `${path(pWith)} L 100 ${pWithout[pWithout.length - 1][1].toFixed(2)} ${[...pWithout].reverse().map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')} Z`;
  const endWith    = withR[months - 1];
  const endWithout = without[months - 1];
  const liftPct = (endWith / endWithout - 1) * 100;

  return (
    <div className="absolute inset-0 p-10 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <Badge tone="ink" className="mono">RevOps · MMM · Media Plan</Badge>
        <div className="mono text-[11px] uppercase text-mute">v1.0 · prototype</div>
      </div>

      <div className="relative">
        <div className="display text-[clamp(40px,6.4vw,88px)] leading-[0.94] font-bold tracking-[-0.035em]">
          Faire grandir<br/>
          vos revenus,<br/>
          <span className="text-accent">en douceur.</span>
        </div>
        <div className="mt-6 text-[14px] text-mute max-w-[440px] tracking-tight">
          Pupsic est une agence RevOps suisse dédiée aux PME et start-ups post-seed.
          Nous modélisons vos fuites de revenus et allouons votre budget média
          comme un Marketing Mix Model — sans le coût d'un MMM complet.
        </div>
      </div>

      {/* Top-line revenue trajectory: with vs without RevOps */}
      <div className="border-t hair pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Top-line · 12 mois</div>
            <div className="display text-[15px] font-semibold tracking-tight mt-0.5">Avec vs sans RevOps</div>
          </div>
          <div className="text-right">
            <div className="display text-[28px] font-bold tracking-[-0.025em] text-accent num leading-none">
              +{liftPct.toFixed(0)}%
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute mt-1">lift mois 12</div>
          </div>
        </div>

        <svg viewBox="0 0 100 64" className="w-full h-[140px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="liftGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#8D0AF5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Y-axis grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <line key={t} x1="0" x2="100" y1={60 - t * 60} y2={60 - t * 60}
                  stroke="rgba(19,16,34,0.08)" strokeWidth="0.3" />
          ))}
          {/* Lift area */}
          <path d={liftArea} fill="url(#liftGrad)" />
          {/* Without RevOps line */}
          <path d={path(pWithout)} stroke="#6e6a85" strokeWidth="1.2"
                fill="none" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
          {/* With RevOps line */}
          <path d={path(pWith)} stroke="#8D0AF5" strokeWidth="1.8"
                fill="none" vectorEffect="non-scaling-stroke" />
          {/* End points */}
          <circle cx={pWithout[months - 1][0]} cy={pWithout[months - 1][1]} r="1.6"
                  fill="#6e6a85" vectorEffect="non-scaling-stroke" />
          <circle cx={pWith[months - 1][0]} cy={pWith[months - 1][1]} r="2.2"
                  fill="#8D0AF5" stroke="#fafafd" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="flex items-center justify-between mt-3 text-[11px]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-[2px] bg-accent" />
              <span className="text-ink tracking-tight">Avec RevOps</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-px border-t border-dashed border-mute" />
              <span className="text-mute tracking-tight">Sans RevOps</span>
            </span>
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute">M1 → M12</div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ go, login }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e?.preventDefault();
    if (!email.trim() || !pwd.trim()) { setErr('Email et mot de passe requis.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      login({ email: email.trim(), pwd, isDemo: email.trim().toLowerCase() === 'demo@pupsic.ch' });
    }, 350);
  };

  const fillDemo = () => { setEmail('demo@pupsic.ch'); setPwd('demo'); setErr(''); };

  return (
    <AuthShell side={<AuthSideArt />}>
      <Badge tone="line" className="mono mb-6">CONNEXION</Badge>
      <h1 className="display text-[44px] leading-[1.04] font-bold tracking-[-0.025em]">
        Le pipeline<br/>n'attend pas.
      </h1>
      <p className="text-[14px] text-mute mt-3 max-w-[380px]">
        Reprenez votre diagnostic et votre plan média là où vous les avez laissés.
      </p>

      <form className="mt-8 space-y-4" onSubmit={submit}>
        <Input label="Email" type="email" value={email} placeholder="vous@entreprise.ch"
               onChange={e => { setEmail(e.target.value); setErr(''); }} />
        <Input label="Mot de passe" type="password" value={pwd}
               onChange={e => { setPwd(e.target.value); setErr(''); }} />
        {err && <div className="text-[12px] text-bad">{err}</div>}
        <Button type="submit" variant="primary" size="lg" full
                iconRight={busy ? <Spinner size={14} /> : <IconArrowRight size={14} />}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] text-mute mono uppercase">
        <span className="flex-1 border-t hair" />ou<span className="flex-1 border-t hair" />
      </div>

      <button type="button" onClick={fillDemo}
              className="w-full h-11 border hair text-[13px] hover:bg-paper2 transition-colors flex items-center justify-between px-4">
        <span className="flex items-center gap-2 tracking-tight">
          <IconSpark size={14} />
          Utiliser le compte démo
        </span>
        <span className="mono text-[11px] text-mute">demo@pupsic.ch</span>
      </button>

      <div className="mt-6 text-[13px] text-mute">
        Pas encore de compte ?{' '}
        <button onClick={() => go('signup')} className="text-ink underline underline-offset-4 decoration-line hover:decoration-ink">
          Créer un compte
        </button>
      </div>
    </AuthShell>
  );
}

function SignupScreen({ go, signup }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pickedPlan, setPickedPlan] = useState('growth');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    if (!email.trim() || !pwd.trim()) { setErr('Tous les champs sont requis.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      signup({ email: email.trim(), pwd, plan: pickedPlan });
    }, 350);
  };

  return (
    <AuthShell side={<AuthSideArt />}>
      <Badge tone="line" className="mono mb-6">CRÉER UN COMPTE</Badge>
      <h1 className="display text-[44px] leading-[1.04] font-bold tracking-[-0.025em]">
        Visualisez vos fuites<br/>en 3 minutes.
      </h1>

      <form className="mt-7 space-y-4" onSubmit={submit}>
        <Input label="Email professionnel" type="email" value={email} placeholder="vous@entreprise.ch"
               onChange={e => { setEmail(e.target.value); setErr(''); }} />
        <Input label="Mot de passe" type="password" value={pwd}
               onChange={e => { setPwd(e.target.value); setErr(''); }} />

        <div>
          <div className="text-[12px] font-medium text-mute mb-2 tracking-tight">Plan</div>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_ORDER.map(id => {
              const p = PLANS[id];
              const active = pickedPlan === id;
              return (
                <button key={id} type="button" onClick={() => setPickedPlan(id)}
                        className={cn('text-left p-3 border transition-colors',
                                      active ? 'border-ink bg-paper2' : 'hair hover:border-ink/40')}>
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold tracking-tight">{p.name}</div>
                    {p.starred && <IconStar size={10} className="text-accent" />}
                  </div>
                  <div className="display text-[16px] font-semibold mt-1 num">CHF&nbsp;{p.priceCHF}</div>
                  <div className="text-[10px] text-mute mono uppercase mt-0.5">/MOIS</div>
                </button>
              );
            })}
          </div>
        </div>

        {err && <div className="text-[12px] text-bad">{err}</div>}

        <Button type="submit" variant="primary" size="lg" full
                iconRight={busy ? <Spinner size={14} /> : <IconArrowRight size={14} />}>
          {busy ? 'Création…' : `Créer le compte · ${PLANS[pickedPlan].name}`}
        </Button>
      </form>

      <div className="mt-6 text-[13px] text-mute">
        Déjà inscrit ?{' '}
        <button onClick={() => go('login')} className="text-ink underline underline-offset-4 decoration-line hover:decoration-ink">
          Se connecter
        </button>
      </div>
    </AuthShell>
  );
}

Object.assign(window, { LoginScreen, SignupScreen });
