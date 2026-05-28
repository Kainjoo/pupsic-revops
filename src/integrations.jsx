// ╔════════════════════════════════════════════════════════════════════╗
// ║  Integrations Hub — connect ad platforms, CRMs, analytics, finance ║
// ║                                                                    ║
// ║  4 categories:                                                     ║
// ║    Ads        — Meta, Google Ads, LinkedIn Ads, TikTok             ║
// ║    CRM        — HubSpot, Salesforce, Attio, Pipedrive              ║
// ║    Analytics  — GA4, Plausible, Mixpanel                           ║
// ║    Finance    — Pennylane, Qonto, Stripe (cash + invoice signals)  ║
// ╚════════════════════════════════════════════════════════════════════╝

const INTEGRATIONS = [
  { cat: 'Ads',       items: [
    { id: 'meta',     name: 'Meta Ads',     color: '#0866FF', fields: 'spend · impressions · conv',  feeds: ['mmm', 'media-plan'] },
    { id: 'google',   name: 'Google Ads',   color: '#4285F4', fields: 'spend · clicks · conv',       feeds: ['mmm', 'media-plan'] },
    { id: 'linkedin', name: 'LinkedIn Ads', color: '#0A66C2', fields: 'spend · leads · CTR',         feeds: ['mmm', 'media-plan'] },
    { id: 'tiktok',   name: 'TikTok Ads',   color: '#000000', fields: 'spend · views · conv',        feeds: ['mmm', 'media-plan'] },
  ]},
  { cat: 'CRM',       items: [
    { id: 'hubspot',  name: 'HubSpot',      color: '#FF7A59', fields: 'contacts · deals · activity', feeds: ['rfm', 'calculator', 'dashboard'] },
    { id: 'salesforce',name:'Salesforce',   color: '#00A1E0', fields: 'accounts · opps · history',   feeds: ['rfm', 'calculator'] },
    { id: 'attio',    name: 'Attio',        color: '#4318FF', fields: 'records · workflow data',     feeds: ['rfm'] },
    { id: 'pipedrive',name: 'Pipedrive',    color: '#1A1A1A', fields: 'pipeline · deals · stages',   feeds: ['calculator'] },
  ]},
  { cat: 'Analytics', items: [
    { id: 'ga4',      name: 'Google Analytics 4', color: '#E37400', fields: 'sessions · conv · attribution', feeds: ['calculator', 'mmm'] },
    { id: 'plausible',name: 'Plausible',          color: '#5850EC', fields: 'visits · sources · goals',      feeds: ['calculator'] },
    { id: 'mixpanel', name: 'Mixpanel',           color: '#7856FF', fields: 'events · cohorts · retention',  feeds: ['rfm'] },
  ]},
  { cat: 'Finance',   items: [
    { id: 'pennylane',name: 'Pennylane',          color: '#1A2740', fields: 'P&L · cash · invoices', feeds: ['dashboard'] },
    { id: 'qonto',    name: 'Qonto',              color: '#1A1F36', fields: 'bank · cash flow',      feeds: ['dashboard'] },
    { id: 'stripe',   name: 'Stripe',             color: '#635BFF', fields: 'MRR · churn · payments',feeds: ['rfm', 'dashboard'] },
  ]},
];

function IntegrationsScreen({ user, plan, profile, go }) {
  const { toast } = useToast();
  const [connections, setConnections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pupsic_connections') || '{}'); }
    catch { return {}; }
  });
  const [connectingId, setConnectingId] = useState(null);

  useEffect(() => {
    try { localStorage.setItem('pupsic_connections', JSON.stringify(connections)); } catch {}
  }, [connections]);

  const connect = (id, name) => {
    setConnectingId(id);
    setTimeout(() => {
      setConnections(c => ({ ...c, [id]: { connectedAt: Date.now() } }));
      setConnectingId(null);
      toast(`${name} connecté · sync en cours`, { tone: 'accent' });
    }, 900);
  };
  const disconnect = (id) => setConnections(c => { const n = { ...c }; delete n[id]; return n; });

  const totalConnected = Object.keys(connections).length;
  const totalAvailable = INTEGRATIONS.reduce((a, g) => a + g.items.length, 0);

  return (
    <PageShell user={user} plan={plan} currentScreen="app/integrations" go={go} logout={() => go('login')}>
      <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-10 lg:py-14">

        <div className="flex items-end justify-between gap-6 flex-wrap pb-10 mb-10 border-b hair">
          <div>
            <div className="t-caption text-mute">Connexions · données live</div>
            <h1 className="t-hero text-ink mt-3">Branchez vos sources.</h1>
            <p className="t-body text-mute mt-3 max-w-[620px]">
              Plus vos chiffres sont réels, plus le modèle est précis. Connectez vos plateformes pub,
              votre CRM, votre analytics et vos signaux financiers — chaque module qui en bénéficie est listé.
            </p>
          </div>
          <div className="text-right">
            <div className="t-caption text-mute">État</div>
            <div className="t-num text-accent mt-1.5">{totalConnected} / {totalAvailable}</div>
            <div className="t-caption text-mute mt-1">connectés</div>
          </div>
        </div>

        {INTEGRATIONS.map((g) => (
          <div key={g.cat} className="pb-10 mb-10 border-b hair last:border-b-0">
            <div className="t-caption text-mute mb-5">{g.cat}</div>
            <div className="divide-y hair">
              {g.items.map(it => {
                const connected = !!connections[it.id];
                const connecting = connectingId === it.id;
                return (
                  <div key={it.id} className="py-4 grid grid-cols-[28px_1fr_260px_140px] items-center gap-5">
                    <div className="w-7 h-7 inline-flex items-center justify-center text-paper t-caption" style={{ background: it.color, fontSize: 13 }}>
                      {it.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="t-body text-ink">{it.name}</div>
                      <div className="t-caption text-mute mt-1 normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                        {it.fields}
                      </div>
                    </div>
                    <div className="t-caption text-mute">
                      Alimente · {it.feeds.join(' · ')}
                    </div>
                    <div className="text-right">
                      {connected ? (
                        <button onClick={() => disconnect(it.id)}
                                className="t-caption text-mute hover:text-bad transition-colors">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                            <span>Connecté · déconnecter</span>
                          </span>
                        </button>
                      ) : connecting ? (
                        <span className="t-caption text-mute inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
                          Connexion…
                        </span>
                      ) : (
                        <button onClick={() => connect(it.id, it.name)}
                                className="t-caption text-accent hover:text-ink transition-colors">
                          Connecter →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="t-body text-mute leading-relaxed max-w-[680px]">
          <span className="t-caption text-mute">Sécurité · </span>
          Authentification OAuth2 standard · données chiffrées TLS en transit, AES-256 au repos ·
          hébergement Zurich (équivalences ISO 27001) · suppression sur demande.
        </div>

      </div>
    </PageShell>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  Growth Financing — contextual CTA placed where the budget gap appears
// ────────────────────────────────────────────────────────────────────────
//  Shown inside the Dashboard "Leviers" list when the budget lever > a
//  meaningful threshold. Partner CTA = neutral framing (not an ad).

function GrowthFinancingNote({ monthlyDelta, annualNeed, go }) {
  if (!monthlyDelta || monthlyDelta < 5000) return null;
  return (
    <div className="mt-4 pt-4 border-t hair flex items-start gap-3">
      <span className="w-7 h-7 inline-flex items-center justify-center border hair shrink-0 mt-0.5">
        <IconCoins size={13} className="text-accent" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="t-caption text-accent">Financer la croissance</div>
        <p className="t-body text-ink mt-1.5 max-w-[620px]">
          Pour activer ce levier vous avez besoin de <span className="text-accent">{fmtCHF(monthlyDelta)}</span> de paid
          supplémentaire par mois sur 12 mois, soit <span className="text-accent">{fmtCHFShort(annualNeed)}</span> annuels.
          Des partenaires financent la croissance basée sur le revenu (revenue-based, non dilutif) ou
          via crédit cantonal.
        </p>
        <div className="mt-3 flex items-center gap-3 t-body">
          <button onClick={() => go && go('app/financing')}
                  className="text-ink hover:text-accent underline underline-offset-4 decoration-line">
            Voir les options →
          </button>
          <span className="text-line">·</span>
          <span className="t-caption text-mute">Partenaires · Karmen · Silvr · BCV · BCGE</span>
        </div>
      </div>
    </div>
  );
}

function FinancingScreen({ user, plan, profile, go }) {
  const partners = [
    { id: 'karmen', name: 'Karmen',        type: 'Revenue-based financing',  range: '20k–5M €',   speed: '48h', cost: '5–10% flat', terms: 'Remboursement sur % du CA mensuel · non-dilutif · pas de garantie personnelle' },
    { id: 'silvr',  name: 'Silvr',         type: 'Revenue-based financing',  range: '10k–10M €',  speed: '72h', cost: '6–12% flat', terms: 'Pour SaaS et e-com · décaissement instantané · scoring sur MRR' },
    { id: 'bcv',    name: 'BCV',           type: 'Crédit PME · cantonal',    range: '50k–2M CHF', speed: '2-4 sem.', cost: 'Taux SARON + 2-4%', terms: 'Vaud · garantie cautionnement romand possible · amortissement 5-7 ans' },
    { id: 'bcge',   name: 'BCGE',          type: 'Crédit PME · cantonal',    range: '50k–2M CHF', speed: '2-4 sem.', cost: 'Taux SARON + 2-4%', terms: 'Genève · partenariat OBTG · accompagnement structuration' },
    { id: 'lendico',name: 'Lendico Suisse',type: 'Crédit en ligne PME',      range: '20k–500k CHF', speed: '1 sem.', cost: '4-8% annuel', terms: 'Plateforme · décision rapide · garanties simplifiées' },
  ];

  return (
    <PageShell user={user} plan={plan} currentScreen="app/financing" go={go} logout={() => go('login')}>
      <div className="max-w-[1100px] mx-auto px-8 lg:px-12 py-10 lg:py-14">
        <div className="flex items-end justify-between gap-6 flex-wrap pb-10 mb-10 border-b hair">
          <div>
            <div className="t-caption text-mute">Financer · partenaires non-dilutifs</div>
            <h1 className="t-hero text-ink mt-3">Pas obligé de lever pour grandir.</h1>
            <p className="t-body text-mute mt-3 max-w-[620px]">
              Cinq voies pour financer votre paid media et votre croissance sans dilution.
              Comparez vitesse, coût et conditions. Pupsic est intermédiaire neutre — vous traitez en direct.
            </p>
          </div>
        </div>

        <div className="divide-y hair">
          {partners.map(p => (
            <div key={p.id} className="py-6 grid grid-cols-1 lg:grid-cols-[180px_1fr_140px_120px] items-baseline gap-6">
              <div>
                <div className="t-body text-ink">{p.name}</div>
                <div className="t-caption text-mute mt-1 normal-case" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                  {p.type}
                </div>
              </div>
              <div className="t-body text-mute leading-relaxed">{p.terms}</div>
              <div>
                <div className="t-caption text-mute">Montant</div>
                <div className="t-body text-ink num mt-1">{p.range}</div>
                <div className="t-caption text-mute mt-2">Délai · {p.speed}</div>
              </div>
              <div className="text-right">
                <div className="t-caption text-mute">Coût</div>
                <div className="t-body text-ink mt-1">{p.cost}</div>
                <a href="#" onClick={(e) => e.preventDefault()}
                   className="t-caption text-accent hover:text-ink inline-block mt-3">
                  Demander un devis →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="t-body text-mute leading-relaxed max-w-[680px] mt-10">
          <span className="t-caption text-mute">Important · </span>
          Pupsic n'est ni courtier ni prêteur. Aucune commission perçue sur les transactions.
          Liens partenaires fournis à titre informatif. Toujours comparer plusieurs offres et lire les conditions.
        </div>
      </div>
    </PageShell>
  );
}

Object.assign(window, { IntegrationsScreen, FinancingScreen, GrowthFinancingNote, INTEGRATIONS });
