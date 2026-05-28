// Root app: router state, demo data, plan persistence, onboarding profile
function makeDemoState() {
  const profile = {
    industry: 'saas_b2b',
    country: 'CH',
    lifecycle: 'growth',
    sizeBand: 'small',
    revenueBand: 'r2',
    caAnnuel: 1200000,
    salesTeam: 4,
    currentRevops: 4500,
    priority: 'response_time',
    maturity: {
      data: 2,
      leadops: 2,
      attribution: 1,
      alignment: 2,
      stack: 2,
      reporting: 1,
    },
    onboardingCompleted: true,
  };
  const inputs = { ...DEFAULT_SCENARIO_INPUTS, ...profile };
  return {
    user: { email: 'demo@pupsic.ch', name: 'Demo', isDemo: true },
    plan: 'growth',
    profile,
    currentScreen: 'app/dashboard',
    scenarios: [
      {
        id: uid(),
        name: 'Pipeline SaaS B2B — Q2',
        inputs,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
      },
      {
        id: uid(),
        name: 'Pipeline e-commerce — launch DE',
        inputs: {
          ...inputs,
          industry: 'ecom', country: 'EU', lifecycle: 'launch', revenueBand: 'r1',
          caAnnuel: 720000, leadsMois: 1800, conversion: 0.08, closing: 0.14,
          panier: 240, responseTimeMin: 28, equipe: 3, salesTeam: 3,
        },
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
      },
    ],
    mmmSpend: { ...DEFAULT_SPEND },
    mediaPlan: CHANNELS.reduce((acc, c) => {
      acc[c.id] = Array.from({ length: 12 }, (_, m) => {
        const season = [0.85, 0.85, 1.0, 1.05, 1.1, 1.0, 0.9, 0.7, 1.15, 1.2, 1.25, 1.05][m];
        return Math.round((DEFAULT_SPEND[c.id] || 0) * season);
      });
      return acc;
    }, {}),
    // Seeded trials & folders for demo — shows the feature out of the box.
    folders: [
      { id: 'default', name: 'Sans dossier',     createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
      { id: 'fy26',    name: 'Plan FY26',        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20 },
      { id: 'expansion', name: 'Expansion DACH', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
    ],
    trials: [
      {
        id: uid(),
        name: 'Base · Q2 actuelle',
        folderId: 'fy26',
        snapshot: {
          profile: { ...profile },
          mmmSpend: { ...DEFAULT_SPEND },
          mediaPlan: {},
          scenarios: [],
        },
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      },
      {
        id: uid(),
        name: 'Scénario agressif · +40% paid',
        folderId: 'fy26',
        snapshot: {
          profile: { ...profile },
          mmmSpend: Object.fromEntries(Object.entries(DEFAULT_SPEND).map(([k, v]) => [k, Math.round(v * 1.4)])),
          mediaPlan: {},
          scenarios: [],
        },
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      },
      {
        id: uid(),
        name: 'Test marché Allemagne',
        folderId: 'expansion',
        snapshot: {
          profile: { ...profile, country: 'EU' },
          mmmSpend: { ...DEFAULT_SPEND },
          mediaPlan: {},
          scenarios: [],
        },
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
      },
    ],
    currentTrialId: null,
  };
}

function emptyState() {
  return {
    user: null,
    plan: 'starter',
    profile: { ...EMPTY_PROFILE },
    annualTarget: 8_000_000,   // Master equation: yearly top-line target driving all reconciliation views
    currentScreen: 'login',
    scenarios: [],
    mmmSpend: { ...DEFAULT_SPEND },
    mediaPlan: CHANNELS.reduce((acc, c) => {
      acc[c.id] = Array.from({ length: 12 }, () => 0);
      return acc;
    }, {}),
    // Trials = saved snapshots of full app state (profile + mix + budgets + scenarios).
    // Folders organize trials. currentTrialId tracks the active one (null = unsaved).
    folders: [
      { id: 'default', name: 'Sans dossier', createdAt: Date.now() },
    ],
    trials: [],
    currentTrialId: null,
  };
}

function App() {
  const [state, setState] = useState(emptyState);
  const [screenContext, setScreenContext] = useState({});
  const [trialsOpen, setTrialsOpen] = useState(false);
  // mode: 'simple' (Brand Planner default home) | 'expert' (full nav)
  const [mode, setMode] = useState('simple');
  // Stash setMode globally so deep screens can flip back without prop drilling
  useEffect(() => { window.__pupsicSetMode = setMode; }, [setMode]);
  useEffect(() => { window.__pupsicOpenTrials = (v = true) => setTrialsOpen(v); }, []);

  const go = useCallback((screen, ctx = {}) => {
    setScreenContext(ctx);
    setState(s => ({ ...s, currentScreen: screen }));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const login = useCallback(({ email, isDemo }) => {
    if (isDemo) {
      setState({ ...makeDemoState(), currentScreen: 'app/plan' });
      setMode('simple');
    } else {
      const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      setState(s => {
        const sameUser = s.user?.email === email && s.profile?.onboardingCompleted;
        return {
          ...s,
          user: { email, name },
          plan: sameUser ? s.plan : 'starter',
          profile: sameUser ? s.profile : { ...EMPTY_PROFILE },
          currentScreen: sameUser ? 'app/plan' : 'app/onboarding',
        };
      });
    }
  }, []);

  const signup = useCallback(({ email, plan }) => {
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    setState(s => ({
      ...s,
      user: { email, name },
      plan,
      profile: { ...EMPTY_PROFILE },
      currentScreen: 'app/onboarding',
    }));
  }, []);

  const logout = useCallback(() => {
    setState(emptyState());
    setScreenContext({});
  }, []);

  const setPlan = useCallback((plan) => setState(s => ({ ...s, plan })), []);
  const setProfile = useCallback((profile) => setState(s => ({ ...s, profile })), []);

  const addScenario = useCallback(({ name, inputs }) => {
    const s = { id: uid(), name, inputs: { ...inputs }, createdAt: Date.now(), updatedAt: Date.now() };
    setState(prev => ({ ...prev, scenarios: [s, ...prev.scenarios] }));
    return s;
  }, []);

  const updateScenario = useCallback((id, patch) => {
    setState(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s),
    }));
  }, []);

  const setMMMSpend = useCallback((next) => {
    setState(prev => ({ ...prev, mmmSpend: typeof next === 'function' ? next(prev.mmmSpend) : next }));
  }, []);
  const setMediaPlan = useCallback((next) => {
    setState(prev => ({ ...prev, mediaPlan: typeof next === 'function' ? next(prev.mediaPlan) : next }));
  }, []);
  const setAnnualTarget = useCallback((v) => {
    setState(prev => ({ ...prev, annualTarget: Math.max(0, Number(v) || 0) }));
  }, []);

  // ── Trials & folders ──────────────────────────────────────────────────
  const captureSnapshot = useCallback((s) => ({
    profile: { ...s.profile },
    mmmSpend: { ...s.mmmSpend },
    mediaPlan: Object.fromEntries(Object.entries(s.mediaPlan).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v])),
    scenarios: s.scenarios.map(sc => ({ ...sc })),
  }), []);

  const saveAsTrial = useCallback(({ name, folderId = 'default' }) => {
    setState(prev => {
      const trial = {
        id: uid(),
        name: name || `Trial · ${new Date().toLocaleDateString('fr-CH')}`,
        folderId,
        snapshot: captureSnapshot(prev),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return { ...prev, trials: [trial, ...prev.trials], currentTrialId: trial.id };
    });
  }, [captureSnapshot]);

  const updateCurrentTrial = useCallback(() => {
    setState(prev => {
      if (!prev.currentTrialId) return prev;
      return {
        ...prev,
        trials: prev.trials.map(t => t.id === prev.currentTrialId
          ? { ...t, snapshot: captureSnapshot(prev), updatedAt: Date.now() }
          : t),
      };
    });
  }, [captureSnapshot]);

  const loadTrial = useCallback((trialId) => {
    setState(prev => {
      const trial = prev.trials.find(t => t.id === trialId);
      if (!trial) return prev;
      return {
        ...prev,
        ...trial.snapshot,
        currentTrialId: trial.id,
      };
    });
  }, []);

  const duplicateTrial = useCallback((trialId) => {
    setState(prev => {
      const src = prev.trials.find(t => t.id === trialId);
      if (!src) return prev;
      const copy = { ...src, id: uid(), name: `${src.name} (copie)`, createdAt: Date.now(), updatedAt: Date.now() };
      return { ...prev, trials: [copy, ...prev.trials] };
    });
  }, []);

  const renameTrial = useCallback((trialId, name) => {
    setState(prev => ({
      ...prev,
      trials: prev.trials.map(t => t.id === trialId ? { ...t, name, updatedAt: Date.now() } : t),
    }));
  }, []);

  const deleteTrial = useCallback((trialId) => {
    setState(prev => ({
      ...prev,
      trials: prev.trials.filter(t => t.id !== trialId),
      currentTrialId: prev.currentTrialId === trialId ? null : prev.currentTrialId,
    }));
  }, []);

  const moveTrial = useCallback((trialId, folderId) => {
    setState(prev => ({
      ...prev,
      trials: prev.trials.map(t => t.id === trialId ? { ...t, folderId, updatedAt: Date.now() } : t),
    }));
  }, []);

  const createFolder = useCallback((name) => {
    setState(prev => ({
      ...prev,
      folders: [...prev.folders, { id: uid(), name: name || 'Nouveau dossier', createdAt: Date.now() }],
    }));
  }, []);

  const renameFolder = useCallback((folderId, name) => {
    setState(prev => ({
      ...prev,
      folders: prev.folders.map(f => f.id === folderId ? { ...f, name } : f),
    }));
  }, []);

  const deleteFolder = useCallback((folderId) => {
    if (folderId === 'default') return;
    setState(prev => ({
      ...prev,
      folders: prev.folders.filter(f => f.id !== folderId),
      // Move trials from deleted folder to default
      trials: prev.trials.map(t => t.folderId === folderId ? { ...t, folderId: 'default' } : t),
    }));
  }, []);

  // Expose globally so deep screens can open the trials panel
  useEffect(() => {
    window.__pupsicTrials = {
      saveAsTrial, updateCurrentTrial, loadTrial, duplicateTrial,
      renameTrial, deleteTrial, moveTrial,
      createFolder, renameFolder, deleteFolder,
    };
  }, [saveAsTrial, updateCurrentTrial, loadTrial, duplicateTrial, renameTrial, deleteTrial, moveTrial, createFolder, renameFolder, deleteFolder]);

  const screen = state.currentScreen;

  // Guard: any app/* needs user; profile-required screens redirect to onboarding
  useEffect(() => {
    if (screen.startsWith('app/') && !state.user) { go('login'); return; }
    if (screen.startsWith('app/') && screen !== 'app/onboarding' && !state.profile?.onboardingCompleted) {
      go('app/onboarding');
    }
    // After onboarding finishes, route simple users to the Brand Planner.
    if (screen === 'app/dashboard' && mode === 'simple' && state.profile?.onboardingCompleted) {
      go('app/plan');
    }
  }, [screen, state.user, state.profile?.onboardingCompleted, mode]);

  let view = null;
  if (screen === 'login') {
    view = <LoginScreen go={go} login={login} />;
  } else if (screen === 'signup') {
    // Open signup is removed — access is gated by waitlist + invited login.
    view = <LoginScreen go={go} login={login} />;
  } else if (screen === 'pricing') {
    view = <PricingScreen user={state.user} plan={state.plan} go={go} setPlan={setPlan} />;
  } else if (screen === 'app/onboarding') {
    view = <OnboardingScreen user={state.user} profile={state.profile} setProfile={setProfile} go={go} />;
  } else if (screen === 'app/plan') {
    view = <BrandPlannerScreen user={state.user} plan={state.plan}
                               profile={state.profile}
                               scenarios={state.scenarios}
                               mmmSpend={state.mmmSpend} setMMMSpend={setMMMSpend}
                               go={go} setMode={setMode} />;
  } else if (screen === 'app/dashboard') {
    view = <DashboardScreen user={state.user} plan={state.plan}
                            profile={state.profile}
                            scenarios={state.scenarios}
                            mediaPlan={state.mediaPlan}
                            mmmSpend={state.mmmSpend}
                            annualTarget={state.annualTarget}
                            setAnnualTarget={setAnnualTarget}
                            go={go} />;
  } else if (screen === 'app/calculator') {
    view = <CalculatorScreen user={state.user} plan={state.plan}
                             profile={state.profile}
                             scenarios={state.scenarios}
                             addScenario={addScenario}
                             updateScenario={updateScenario}
                             focusScenarioId={screenContext.scenarioId}
                             go={go} />;
  } else if (screen === 'app/mmm') {
    view = <MMMScreen user={state.user} plan={state.plan}
                      mmmSpend={state.mmmSpend} setMMMSpend={setMMMSpend}
                      mediaPlan={state.mediaPlan} setMediaPlan={setMediaPlan}
                      go={go} />;
  } else if (screen === 'app/media-plan') {
    view = <MediaPlanScreen user={state.user} plan={state.plan}
                            profile={state.profile}
                            mediaPlan={state.mediaPlan} setMediaPlan={setMediaPlan}
                            mmmSpend={state.mmmSpend}
                            go={go} />;
  } else if (screen === 'app/simulator') {
    view = <SimulatorScreen user={state.user} plan={state.plan}
                            profile={state.profile}
                            scenarios={state.scenarios}
                            mmmSpend={state.mmmSpend} setMMMSpend={setMMMSpend}
                            go={go} />;
  } else if (screen === 'app/rfm') {
    view = <RFMScreen user={state.user} plan={state.plan}
                      profile={state.profile}
                      scenarios={state.scenarios}
                      go={go} />;
  } else if (screen === 'app/integrations') {
    view = <IntegrationsScreen user={state.user} plan={state.plan} profile={state.profile} go={go} />;
  } else if (screen === 'app/financing') {
    view = <FinancingScreen user={state.user} plan={state.plan} profile={state.profile} go={go} />;
  } else if (screen === 'app/cockpit') {
    view = <CockpitScreen user={state.user} plan={state.plan}
                          profile={state.profile}
                          scenarios={state.scenarios}
                          mmmSpend={state.mmmSpend}
                          go={go} />;
  } else if (screen === 'app/account') {
    view = <AccountScreen user={state.user} plan={state.plan}
                          profile={state.profile}
                          setPlan={setPlan} scenarios={state.scenarios}
                          go={go} logout={logout} />;
  } else {
    view = <LoginScreen go={go} login={login} />;
  }

  return <ToastProvider><WaitlistProvider prefilledEmail={state.user?.email}>
    {view}
    <TrialsPanel open={trialsOpen} onClose={() => setTrialsOpen(false)} state={state} />
  </WaitlistProvider></ToastProvider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
