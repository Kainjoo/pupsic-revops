// Login + Signup screens
function AuthShell({ children, side }) {
  return (
    <div className="min-h-full flex flex-col">
      <DemoBanner />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="px-6 lg:px-14 py-10 flex flex-col">
          <div className="mb-12">
            <span className="inline-flex items-center gap-2.5 select-none">
              <span className="inline-flex items-center justify-center bg-accent"
                    style={{ width: 27, height: 27, borderRadius: 6 }}>
                <img src={(typeof window !== 'undefined' && window.__resources && window.__resources.popsicEmblem)
                          || 'https://assets.kainjoo.com/wp-content/uploads/sites/40/2025/05/emblem-popsic-white.png'}
                     alt=""
                     style={{ width: 19, height: 19, objectFit: 'contain' }} />
              </span>
              <span className="mono uppercase text-ink text-[12px] tracking-[0.06em] font-semibold" style={{ marginTop: 2, lineHeight: 1 }}>
                RevOps Calculator
              </span>
            </span>
          </div>
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
  const slides = useMemo(() => [
    {
      id: 'lift',
      eyebrow: 'Top-line · 12 mois',
      title: <>Faire grandir<br/>vos revenus,<br/><span className="text-accent">en douceur.</span></>,
      lead: 'Modèle de croissance back-testé sur les benchmarks Bessemer · OpenView · WordStream 2024. Calibré pour les PME suisses post-seed.',
      stat: '+49%',
      statLabel: 'lift mois 12',
      Visual: AuthLiftChart,
    },
    {
      id: 'mmm',
      eyebrow: 'Marketing Mix Model',
      title: <>Allouez chaque<br/>franc média<br/><span className="text-accent">là où il rapporte.</span></>,
      lead: '8 canaux modélisés en courbes de saturation. ROAS marginal calculé en continu. Réallouez vers les canaux sous-investis en un clic.',
      stat: '5,2×',
      statLabel: 'ROAS pondéré cible',
      Visual: AuthMMMRadar,
    },
    {
      id: 'rfm',
      eyebrow: 'Segmentation RFM',
      title: <>Identifiez vos<br/><span className="text-accent">20% qui font</span><br/>80% du revenu.</>,
      lead: 'Champions, Loyal, Casual, At-risk. Chaque segment a son playbook : VIP, upsell, activation, win-back. Sources : Bain Loyalty · Klaviyo 2024.',
      stat: '4',
      statLabel: 'segments actionnables',
      Visual: AuthRFMBlocks,
    },
    {
      id: 'plan',
      eyebrow: 'Media Plan trimestriel',
      title: <>Un plan média<br/><span className="text-accent">aligné</span><br/>sur votre cible.</>,
      lead: 'B2B, B2C ou hybride : seuls les canaux pertinents pour votre audience. Saisonnalité ajustable, ROAS et conversions projetés.',
      stat: 'Q1–Q4',
      statLabel: 'trimestres éditables',
      Visual: AuthMediaPlan,
    },
  ], []);

  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    if (pausedRef.current) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % slides.length), 7000);
    return () => clearTimeout(t);
  }, [idx, slides.length]);

  const slide = slides[idx];
  const Visual = slide.Visual;

  return (
    <div className="absolute inset-0 p-10 flex flex-col justify-between"
         onMouseEnter={() => { pausedRef.current = true; }}
         onMouseLeave={() => { pausedRef.current = false; }}>
      {/* Eyebrow + dots row */}
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] uppercase tracking-[0.10em] text-mute">
          {slide.eyebrow}
        </div>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={cn('h-1 transition-all',
                                  i === idx ? 'w-6 bg-accent' : 'w-3 bg-line2 hover:bg-mute')} />
          ))}
        </div>
      </div>

      {/* Headline + lead — animated transition */}
      <div className="relative">
        <div key={slide.id} className="auth-slide-in">
          <h2 className="display text-[clamp(28px,4.2vw,52px)] leading-[0.98] font-semibold tracking-[-0.025em] max-w-[480px]">
            {slide.title}
          </h2>
          <p className="mt-4 text-[13px] text-mute max-w-[460px] tracking-tight leading-relaxed">
            {slide.lead}
          </p>
        </div>
      </div>

      {/* Visual + stat */}
      <div className="border-t hair pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.10em] text-mute">{slide.eyebrow}</div>
            <div className="text-[14px] font-medium tracking-tight mt-0.5 text-ink">{slide.id === 'lift' ? 'Avec vs sans RevOps' : slide.id === 'mmm' ? 'Mix optimal · 8 canaux' : slide.id === 'rfm' ? 'Champions · Loyal · Casual · At-risk' : 'Q1 · Q2 · Q3 · Q4'}</div>
          </div>
          <div className="text-right">
            <div className="display text-[26px] font-semibold tracking-[-0.025em] text-accent num leading-none">
              {slide.stat}
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.06em] text-mute mt-1">{slide.statLabel}</div>
          </div>
        </div>

        <div key={`v-${slide.id}`} className="auth-slide-in">
          <Visual />
        </div>
      </div>

      <style>{`
        @keyframes authSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-slide-in { animation: authSlideIn 480ms cubic-bezier(.2,.7,.2,1); }
      `}</style>
    </div>
  );
}

// ── Visual #1: Avec vs sans RevOps lift chart ──────────────────────────
function AuthLiftChart() {
  const months = 12;
  const baseStart = 100;
  const without = Array.from({ length: months }, (_, i) => baseStart * Math.pow(1.006, i));
  const withR   = Array.from({ length: months }, (_, i) => {
    const t = i / (months - 1);
    return baseStart * (1 + 0.65 * (1 - Math.exp(-2.4 * t)));
  });
  const yMax = Math.max(...withR) * 1.05;
  const yMin = baseStart * 0.92;
  const xy = (arr) => arr.map((v, i) => {
    const x = (i / (months - 1)) * 100;
    const y = 60 - ((v - yMin) / (yMax - yMin)) * 60;
    return [x, y];
  });
  const pW = xy(withR);
  const pN = xy(without);
  const smooth = (pts) => {
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  };
  const dW = smooth(pW);
  const dN = smooth(pN);
  const area = `${dW} L 100 ${pN[pN.length - 1][1].toFixed(2)} L 0 ${pN[0][1].toFixed(2)} Z`;

  return (
    <div className="relative pr-[100px]">
      <svg viewBox="0 0 100 64" className="w-full h-[140px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="liftGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1="0" x2="100" y1={60 - t * 60} y2={60 - t * 60}
                stroke="rgba(19,16,34,0.08)" strokeWidth="0.3" />
        ))}
        <path d={area} fill="url(#liftGrad)" />
        <path d={dN} stroke="#6e6a85" strokeWidth="1.2" fill="none" strokeDasharray="2 1.5"
              strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={dW} stroke="#8D0AF5" strokeWidth="1.8" fill="none"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={pN[months-1][0]} cy={pN[months-1][1]} r="1.6" fill="#6e6a85" />
        <circle cx={pW[months-1][0]} cy={pW[months-1][1]} r="2.2" fill="#8D0AF5" stroke="#fafafd" strokeWidth="0.8" />
      </svg>
      <div className="absolute top-0 right-0 w-[100px] h-[140px] pointer-events-none">
        <div className="absolute left-[10px] -translate-y-1/2 flex items-center gap-1.5"
             style={{ top: `${(pW[months-1][1] / 64) * 100}%` }}>
          <span className="inline-block w-3 h-[2px] bg-accent" />
          <span className="mono text-[9.5px] uppercase tracking-[0.08em] text-accent whitespace-nowrap">Avec RevOps</span>
        </div>
        <div className="absolute left-[10px] -translate-y-1/2 flex items-center gap-1.5"
             style={{ top: `${(pN[months-1][1] / 64) * 100}%` }}>
          <span className="inline-block w-3 h-px border-t border-dashed border-mute" />
          <span className="mono text-[9.5px] uppercase tracking-[0.08em] text-mute whitespace-nowrap">Sans RevOps</span>
        </div>
      </div>
    </div>
  );
}

// ── Visual #2: MMM mini radar ──────────────────────────────────────────
function AuthMMMRadar() {
  const channels = [
    { id: 'gsearch',  name: 'Search',    share: 0.30, util: 0.55, hue: '#131022' },
    { id: 'gpmax',    name: 'PMax',      share: 0.15, util: 0.65, hue: '#3E0CB7' },
    { id: 'meta',     name: 'Meta',      share: 0.18, util: 0.50, hue: '#8D0AF5' },
    { id: 'linkedin', name: 'LinkedIn',  share: 0.06, util: 0.30, hue: '#2F2748' },
    { id: 'tiktok',   name: 'TikTok',    share: 0.04, util: 0.20, hue: '#FD89FF' },
    { id: 'seo',      name: 'SEO',       share: 0.07, util: 0.45, hue: '#6e6a85' },
    { id: 'email',    name: 'Email',     share: 0.12, util: 0.80, hue: '#c576f0' },
    { id: 'aff',      name: 'Aff.',      share: 0.08, util: 0.35, hue: '#a40fa9' },
  ];
  const N = channels.length;
  const cx = 90, cy = 90, R = 68;
  const angleAt = (i) => (i / N) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, r) => [cx + r * Math.cos(angleAt(i)), cy + r * Math.sin(angleAt(i))];
  const sharePoly = channels.map((c, i) => pt(i, R * c.share * 2.5));
  const utilPoly  = channels.map((c, i) => pt(i, R * c.util));

  return (
    <div className="flex items-center justify-between gap-4 h-[180px]">
      <svg viewBox="0 0 180 180" className="w-[180px] h-[180px] shrink-0">
        <defs>
          <radialGradient id="authRadarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8D0AF5" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#8D0AF5" stopOpacity="0.14" />
          </radialGradient>
        </defs>
        {[0.33, 0.66, 1.0].map((f, ri) => (
          <polygon key={ri}
                   points={channels.map((_, i) => pt(i, R * f).join(',')).join(' ')}
                   fill="none" stroke="rgba(19,16,34,0.20)" strokeWidth="0.8"
                   strokeDasharray={ri === 2 ? '' : '2 2.5'} />
        ))}
        {channels.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                       stroke="rgba(19,16,34,0.16)" strokeWidth="0.6" />;
        })}
        <polygon points={utilPoly.map(p => p.join(',')).join(' ')}
                 fill="none" stroke="rgba(19,16,34,0.55)" strokeWidth="1.4" strokeDasharray="3 2" />
        <polygon points={sharePoly.map(p => p.join(',')).join(' ')}
                 fill="url(#authRadarFill)" stroke="#8D0AF5" strokeWidth="1.8" strokeLinejoin="round" />
        {channels.map((c, i) => {
          const [x, y] = pt(i, R * c.share * 2.5);
          return <circle key={c.id} cx={x} cy={y} r="2.2" fill={c.hue} stroke="#fafafd" strokeWidth="0.8" />;
        })}
      </svg>
      <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10.5px]">
        {channels.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 shrink-0" style={{ background: c.hue }} />
            <span className="text-ink tracking-tight">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Visual #3: RFM 2×2 block grid ──────────────────────────────────────
function AuthRFMBlocks() {
  const segs = [
    { id: 'champions', name: 'Champions', share: 0.15, rev: 0.42, hue: '#8D0AF5' },
    { id: 'loyal',     name: 'Loyal',     share: 0.35, rev: 0.32, hue: '#3E0CB7' },
    { id: 'casual',    name: 'Casual',    share: 0.35, rev: 0.21, hue: '#c576f0' },
    { id: 'at_risk',   name: 'At-risk',   share: 0.15, rev: 0.05, hue: '#6e6a85' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {segs.map(s => (
        <div key={s.id} className="border hair p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: s.hue }} />
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-semibold tracking-tight" style={{ color: s.hue }}>{s.name}</div>
            <div className="mono text-[10px] num text-mute">{Math.round(s.share * 100)}%</div>
          </div>
          <div className="h-1 bg-line2 mt-2 relative">
            <div className="h-full" style={{ width: `${s.rev * 100}%`, background: s.hue }} />
          </div>
          <div className="mono text-[9px] uppercase tracking-[0.06em] text-mute mt-1.5">
            {Math.round(s.rev * 100)}% du revenu
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Visual #4: Quarterly media plan mini ───────────────────────────────
function AuthMediaPlan() {
  const channels = [
    { name: 'Google Search', hue: '#131022', q: [22, 24, 26, 32] },
    { name: 'LinkedIn',      hue: '#2F2748', q: [12, 14, 12, 16] },
    { name: 'SEO',           hue: '#6e6a85', q: [8, 9, 9, 10] },
    { name: 'Email',         hue: '#c576f0', q: [6, 7, 8, 11] },
  ];
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_repeat(4,minmax(0,38px))] gap-2 mono text-[9.5px] uppercase tracking-[0.08em] text-mute mb-1">
        <span></span>
        <span className="text-right">Q1</span>
        <span className="text-right">Q2</span>
        <span className="text-right">Q3</span>
        <span className="text-right">Q4</span>
      </div>
      {channels.map(c => {
        const max = Math.max(...c.q);
        return (
          <div key={c.name} className="grid grid-cols-[1fr_repeat(4,minmax(0,38px))] gap-2 items-center text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 shrink-0" style={{ background: c.hue }} />
              <span className="text-ink tracking-tight truncate">{c.name}</span>
            </div>
            {c.q.map((v, i) => (
              <div key={i} className="text-right relative">
                <div className="absolute inset-0 -mx-0.5 flex items-end">
                  <div className="w-full" style={{ height: `${(v / max) * 18 + 4}px`, background: c.hue, opacity: 0.15 }} />
                </div>
                <div className="relative num text-[10.5px] text-ink py-1">{v}k</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LoginScreen({ go, login }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { openModal: openWaitlist, isOnList } = useWaitlist();

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
        Pas encore invité ?{' '}
        <button onClick={() => openWaitlist('login_footer')}
                className="text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent">
          Rejoignez la waitlist
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
