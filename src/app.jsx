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
  };
}

function emptyState() {
  return {
    user: null,
    plan: 'starter',
    profile: { ...EMPTY_PROFILE },
    currentScreen: 'login',
    scenarios: [],
    mmmSpend: { ...DEFAULT_SPEND },
    mediaPlan: CHANNELS.reduce((acc, c) => {
      acc[c.id] = Array.from({ length: 12 }, () => 0);
      return acc;
    }, {}),
  };
}

function App() {
  const [state, setState] = useState(emptyState);
  const [screenContext, setScreenContext] = useState({});

  const go = useCallback((screen, ctx = {}) => {
    setScreenContext(ctx);
    setState(s => ({ ...s, currentScreen: screen }));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const login = useCallback(({ email, isDemo }) => {
    if (isDemo) {
      setState(makeDemoState());
    } else {
      const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      setState(s => {
        // Prototype: only persist profile across logins for the SAME email.
        const sameUser = s.user?.email === email && s.profile?.onboardingCompleted;
        return {
          ...s,
          user: { email, name },
          plan: sameUser ? s.plan : 'starter',
          profile: sameUser ? s.profile : { ...EMPTY_PROFILE },
          currentScreen: sameUser ? 'app/dashboard' : 'app/onboarding',
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

  const screen = state.currentScreen;

  // Guard: any app/* needs user; profile-required screens redirect to onboarding
  useEffect(() => {
    if (screen.startsWith('app/') && !state.user) { go('login'); return; }
    if (screen.startsWith('app/') && screen !== 'app/onboarding' && !state.profile?.onboardingCompleted) {
      go('app/onboarding');
    }
  }, [screen, state.user, state.profile?.onboardingCompleted]);

  let view = null;
  if (screen === 'login') {
    view = <LoginScreen go={go} login={login} />;
  } else if (screen === 'signup') {
    view = <SignupScreen go={go} signup={signup} />;
  } else if (screen === 'pricing') {
    view = <PricingScreen user={state.user} plan={state.plan} go={go} setPlan={setPlan} />;
  } else if (screen === 'app/onboarding') {
    view = <OnboardingScreen user={state.user} profile={state.profile} setProfile={setProfile} go={go} />;
  } else if (screen === 'app/dashboard') {
    view = <DashboardScreen user={state.user} plan={state.plan}
                            profile={state.profile}
                            scenarios={state.scenarios}
                            mediaPlan={state.mediaPlan}
                            mmmSpend={state.mmmSpend}
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
                            mediaPlan={state.mediaPlan} setMediaPlan={setMediaPlan}
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

  return <ToastProvider>{view}</ToastProvider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
