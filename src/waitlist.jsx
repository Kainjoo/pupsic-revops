// Waitlist — email-capture mechanism for private beta access.
// Used as a CTA on the login screen + Step III of the planner + Cockpit.
// Stores submitted entries in localStorage so the CTA "remembers" the user.

const WAITLIST_KEY = 'pupsic_waitlist_v1';

function readWaitlist() {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem(WAITLIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeWaitlist(entry) {
  try {
    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify({ ...entry, at: Date.now() }));
  } catch {}
}

// ─── Banner CTA — slim editorial strip ───────────────────────────────
// Place near the top of a screen. Click → opens the modal.
function WaitlistBanner({ variant = 'accent', label, sub, openModal }) {
  const lbl = label  || 'Pupsic est en accès anticipé · Rejoignez la liste';
  const sbl = sub    || '12 places par cohorte · onboarding personnel';
  return (
    <button onClick={openModal}
            className={cn('w-full text-left border hair p-4 flex items-center justify-between gap-4 transition-colors',
                          variant === 'accent' ? 'bg-accent text-white border-accent hover:bg-[#7308d4]'
                                                : 'bg-paper hover:bg-paper2/60')}>
      <div className="min-w-0">
        <div className={cn('display text-[15px] font-semibold tracking-tight',
                            variant === 'accent' ? 'text-white' : 'text-ink')}>{lbl}</div>
        <div className={cn('text-[11.5px] mt-0.5',
                            variant === 'accent' ? 'text-white/80' : 'text-mute')}>{sbl}</div>
      </div>
      <span className={cn('mono text-[11px] uppercase tracking-[0.06em] inline-flex items-center gap-1.5 shrink-0',
                          variant === 'accent' ? 'text-white' : 'text-ink')}>
        Rejoindre la liste <IconArrowRight size={12} />
      </span>
    </button>
  );
}

// ─── Hero CTA card — for end-of-flow placement (Step III) ────────────
function WaitlistHeroCard({ openModal, context }) {
  return (
    <Card padded={false} className="overflow-hidden mt-3 print:hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_auto] items-center">
        <div className="p-7 lg:p-9">
          <Badge tone="accent" className="mono mb-3">ACCÈS ANTICIPÉ · COHORTE Q3 2026</Badge>
          <h3 className="display text-[26px] lg:text-[32px] font-bold tracking-[-0.025em] leading-[1.05] max-w-[560px]">
            Activez ce plan avec un copilote RevOps Pupsic.
          </h3>
          <p className="text-[13.5px] text-mute mt-3 max-w-[520px] leading-relaxed">
            Notre suite RevOps est en accès anticipé pour 12 PME et scale-ups suisses par trimestre.
            Rejoignez la liste — vous recevrez votre invitation, votre plan personnalisé et un appel d'audit gratuit.
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <Button variant="accent" size="lg" icon={<IconArrowRight size={14} />}
                    onClick={() => openModal(context)}>
              Rejoindre la waitlist
            </Button>
            <div className="text-[11.5px] text-mute">
              <span className="num">214</span> entreprises déjà inscrites · prochaine cohorte ouverte
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col gap-1 px-9 py-7 border-l hair bg-paper2/40 min-w-[260px]">
          <div className="mono text-[10.5px] uppercase tracking-[0.08em] text-mute">Ce que vous obtenez</div>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-snug">
            <li className="flex gap-2"><span className="text-accent">→</span> Audit RevOps gratuit (45 min)</li>
            <li className="flex gap-2"><span className="text-accent">→</span> Plan exporté en PDF</li>
            <li className="flex gap-2"><span className="text-accent">→</span> Accès anticipé à Financials + Simulator</li>
            <li className="flex gap-2"><span className="text-accent">→</span> Onboarding personnel (1-on-1)</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────
function WaitlistModal({ open, onClose, prefilledEmail, context }) {
  const [email,   setEmail]   = useState(prefilledEmail || '');
  const [name,    setName]    = useState('');
  const [company, setCompany] = useState('');
  const [role,    setRole]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (prefilledEmail) setEmail(prefilledEmail); }, [prefilledEmail]);
  useEffect(() => {
    if (open) { setDone(false); }
    if (!open) {
      // reset busy on close but keep done flag if just submitted
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const valid = /\S+@\S+\.\S+/.test(email);

  const submit = (e) => {
    e?.preventDefault();
    if (!valid) return;
    setBusy(true);
    // Simulate posting; in a real impl this would hit a backend.
    setTimeout(() => {
      writeWaitlist({ email, name, company, role, context: context || null });
      setBusy(false);
      setDone(true);
      toast('Vous êtes sur la liste · merci', { tone: 'accent' });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 fade-in print:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/55 backdrop-blur-sm" />
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="bg-paper max-w-[520px] w-full border hair slide-up shadow-2xl"
             onClick={(e) => e.stopPropagation()}>
          {done ? (
            <div className="p-9 text-center">
              <div className="w-12 h-12 mx-auto inline-flex items-center justify-center bg-accent text-white mb-5">
                <IconCheck size={20} />
              </div>
              <div className="display text-[22px] font-bold tracking-tight">Vous êtes sur la liste.</div>
              <p className="text-[13.5px] text-mute mt-3 max-w-[380px] mx-auto leading-relaxed">
                Nous vous écrivons à <span className="text-ink font-semibold">{email}</span> sous 48h
                avec votre statut et la date d'ouverture de votre cohorte.
              </p>
              <div className="mt-6">
                <Button variant="primary" onClick={onClose}>Continuer</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-7">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <Badge tone="accent" className="mono mb-3">ACCÈS ANTICIPÉ</Badge>
                  <div className="display text-[22px] font-bold tracking-[-0.02em] leading-tight">
                    Rejoindre la waitlist Pupsic.
                  </div>
                  <div className="text-[12.5px] text-mute mt-2 max-w-[380px] leading-snug">
                    12 places par cohorte. Suite RevOps complète + audit gratuit.
                  </div>
                </div>
                <button type="button" onClick={onClose}
                        className="text-mute hover:text-ink w-8 h-8 inline-flex items-center justify-center -mr-2 -mt-2">
                  <IconX size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <Input label="Email professionnel" type="email" value={email}
                       placeholder="vous@entreprise.ch" autoFocus
                       onChange={(e) => setEmail(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="Entreprise" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <Input label="Votre rôle" value={role}
                       placeholder="CMO, Head of Growth, Founder…"
                       onChange={(e) => setRole(e.target.value)} />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-[10.5px] text-mute">
                  En cliquant, vous acceptez d'être contacté par Pupsic.<br />
                  Pas de spam, pas de partage à des tiers.
                </div>
                <Button type="submit" variant="accent" size="lg"
                        iconRight={busy ? <Spinner size={14} /> : <IconArrowRight size={14} />}
                        disabled={!valid || busy}>
                  {busy ? 'Envoi…' : 'Rejoindre'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hook & provider — manages modal state app-wide ──────────────────
const WaitlistCtx = React.createContext({ openModal: () => {}, isOnList: false, entry: null });
function WaitlistProvider({ children, prefilledEmail }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [entry, setEntry] = useState(() => readWaitlist());
  const openModal = useCallback((ctx) => { setContext(ctx || null); setOpen(true); }, []);
  const close = useCallback(() => {
    setOpen(false);
    // Refresh entry after close — captures fresh submission
    setEntry(readWaitlist());
  }, []);
  return (
    <WaitlistCtx.Provider value={{ openModal, isOnList: !!entry, entry }}>
      {children}
      <WaitlistModal open={open} onClose={close} prefilledEmail={prefilledEmail} context={context} />
    </WaitlistCtx.Provider>
  );
}
const useWaitlist = () => React.useContext(WaitlistCtx);

Object.assign(window, {
  WaitlistBanner, WaitlistHeroCard, WaitlistModal, WaitlistProvider, useWaitlist, readWaitlist,
});
