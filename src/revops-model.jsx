// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  RevOps Master Model — single source of truth                         ║
// ║                                                                       ║
// ║  Bridges all expert screens. Every module reads from this hook.       ║
// ║                                                                       ║
// ║  THE EQUATION:                                                        ║
// ║                                                                       ║
// ║    Revenue = (Existing × Retention) + (New ARR) − Churn               ║
// ║    New ARR = Pipeline × Win Rate                                      ║
// ║    Pipeline = Leads × MQL→SQL × SQL→Opp × Avg Deal Size               ║
// ║    Leads   = MMM(Budget by channel × Saturation curves)               ║
// ║                                                                       ║
// ║  Outputs the four lenses a RevOps lead needs:                         ║
// ║    1. BOTTOM-UP : what current state projects                         ║
// ║    2. TOP-DOWN  : what target requires                                ║
// ║    3. GAP       : difference + leviers to close it                    ║
// ║    4. HEALTH    : funnel velocity, coverage, capacity, units          ║
// ╚═══════════════════════════════════════════════════════════════════════╝

function useRevOpsModel({
  profile,
  mmmSpend,
  marketMix = { vaud: 0.45, switzerland: 0.45, others: 0.10 },
  rfmShares,
  target,             // annual target top-line (CHF)
  salesAEs,           // # of fully-ramped AE-equivalents (override profile.salesTeam)
  retentionLift = 1.0,
  newCustomerLift = 1.0,
}) {
  return useMemo(() => {
    // ── 0. Constants from profile ──────────────────────────────────────
    const ind     = INDUSTRIES[profile?.industry]    || INDUSTRIES.saas_b2b;
    const country = (Array.isArray(COUNTRIES)
                       ? COUNTRIES.find(c => c.id === profile?.country)
                       : COUNTRIES?.[profile?.country])
                    || (Array.isArray(COUNTRIES) ? COUNTRIES[0] : null)
                    || { id: 'CH', cacIndex: 1 };
    const lc      = LIFECYCLES[profile?.lifecycle]   || LIFECYCLES.growth;

    const panier      = ind.panier;
    const arpuMonthly = ind.arpuMonthly;
    const margin      = lc.marginOverride != null ? lc.marginOverride : ind.margin;
    const ltvMult     = ind.ltvMult;
    const cacIndex    = country.cacIndex || 1;

    const annualTarget = Math.max(1, Number(target) || profile?.caAnnuel * 1.20 || 8_000_000);

    // ── 1. Existing customer base ──────────────────────────────────────
    // Derived from CA: ~70% comes from existing, blended RFM mult = 0.85
    const startingCustomers = profile?.caAnnuel && arpuMonthly > 0
      ? clamp(Math.round((profile.caAnnuel * 0.70) / (arpuMonthly * 12 * 0.85)), 30, 50000)
      : 320;

    const blendedRetentionMonthly = 0.93;  // weighted RFM retention
    const retainedYear = startingCustomers * Math.pow(blendedRetentionMonthly, 12);
    const churned      = startingCustomers - retainedYear;
    const existingAnnualRev = startingCustomers * 0.85 * arpuMonthly * 12 * (retentionLift * 0.95);

    // ── 2. MMM bottom-up: paid media → revenue ─────────────────────────
    const mmm = computeMMM(mmmSpend || {});
    const sim = simulateTopLine({
      spendByChannel: mmmSpend || {},
      marketMix,
      rfmShares: rfmShares || RFM_SEGMENTS.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {}),
      panier, arpuMonthly,
      startingCustomers,
      retentionLift, newCustomerLift,
      horizonMonths: 12,
    });

    // ── 3. Funnel velocity ─────────────────────────────────────────────
    // Bottom-up: how many leads does our paid spend actually generate?
    // Map: new customer count × full funnel inverse = required lead volume
    const newCustomers = Math.max(0, sim.totals.totalNewCustomers || 0);
    const newAcqRev    = sim.totals.totalNewRev || 0;

    // Inverse funnel: customers → opps → leads → visitors
    const oppsAnnual    = newCustomers / Math.max(0.01, ind.closing);
    const leadsAnnual   = oppsAnnual    / Math.max(0.01, ind.conv);
    const visitorsAnnual= leadsAnnual   / 0.04;                            // 4% visitor→lead
    const leadsMonthly  = leadsAnnual / 12;
    const oppsMonthly   = oppsAnnual / 12;
    const wonMonthly    = newCustomers / 12;

    const funnel = {
      visitors: { monthly: visitorsAnnual / 12, conv: 0.04,         bench: 0.04 },
      leads:    { monthly: leadsMonthly,        conv: 0.04,         bench: 0.04 },
      opps:     { monthly: oppsMonthly,         conv: ind.conv,     bench: ind.conv },
      won:      { monthly: wonMonthly,          conv: ind.closing,  bench: ind.closing },
      salesCycleDays: ind.salesCycleDays,
      avgDealSize: panier,
    };

    // ── 4. Sales capacity ──────────────────────────────────────────────
    const aeCount        = salesAEs != null ? salesAEs : (profile?.salesTeam || 0);
    const aeQuota        = ind.aeQuotaCHF || 0;
    const rampedCapacity = aeCount * aeQuota * 0.85;        // 85% of nameplate (median utilization)
    const pipelineCoverage = annualTarget > 0 && rampedCapacity > 0
      ? rampedCapacity / annualTarget
      : 0;

    // ── 5. Unit economics ──────────────────────────────────────────────
    const cac           = newCustomers > 0 ? (mmm.totalSpend * 12) / newCustomers : 0;
    const ltv           = panier * ltvMult * margin;
    const ltvCacRatio   = cac > 0 ? ltv / cac : 0;
    const cacPaybackMo  = cac > 0 ? cac / (arpuMonthly * margin) : 0;

    // ── 6. BOTTOM-UP total ─────────────────────────────────────────────
    const bottomUpAnnual = existingAnnualRev + newAcqRev;

    // ── 7. TOP-DOWN: what's needed to reach target ─────────────────────
    const gap                  = annualTarget - bottomUpAnnual;
    const additionalCustomers  = newCustomers > 0 && newAcqRev > 0
      ? Math.max(0, gap) / (newAcqRev / newCustomers)
      : 0;
    const additionalLeads      = additionalCustomers / Math.max(0.01, ind.conv * ind.closing);
    // Required additional paid budget — linear extrapolation from current efficiency
    const blendedCAC           = cac || (panier / Math.max(0.01, ind.conv * ind.closing));
    const additionalBudgetMo   = (additionalCustomers * blendedCAC) / 12;

    // ── 8. Coverage / health flags ─────────────────────────────────────
    const flags = [];
    if (gap > bottomUpAnnual * 0.10)
      flags.push({ id: 'gap', tone: 'bad', label: `Manque ${fmtCHFShort(gap)} pour atteindre la cible` });
    if (gap < -bottomUpAnnual * 0.10)
      flags.push({ id: 'sandbag', tone: 'warn', label: 'Cible probablement sandbagged' });
    if (ltvCacRatio > 0 && ltvCacRatio < 3)
      flags.push({ id: 'unitecon', tone: 'warn', label: `LTV/CAC ${ltvCacRatio.toFixed(1)}× sous le seuil 3×` });
    if (aeCount > 0 && pipelineCoverage < 0.6)
      flags.push({ id: 'capacity', tone: 'warn', label: `Capacité commerciale insuffisante (${fmtPct(pipelineCoverage, 0)} de la cible)` });
    if (mmm.roas > 0 && mmm.roas < 2.5)
      flags.push({ id: 'mmm', tone: 'warn', label: `ROAS pondéré ${mmm.roas.toFixed(1)}× sous médiane industrie` });

    // ── 9. Levers — explicit list to close the gap ────────────────────
    // Lever = a specific intervention with its expected revenue impact.
    const levers = [];
    if (gap > 0) {
      levers.push({
        id: 'budget',
        label: 'Augmenter le budget paid',
        delta: additionalBudgetMo,
        unit: 'CHF / mois',
        impact: gap,
        rationale: `Au CAC actuel (${fmtCHF(blendedCAC)}), il faut ${fmtNum(Math.round(additionalCustomers))} nouveaux clients × 12 mois.`,
      });
      // Retention lever
      const retentionDelta = existingAnnualRev * 0.05;
      if (gap > existingAnnualRev * 0.03) {
        levers.push({
          id: 'retention',
          label: 'Programme rétention · +5%',
          delta: 5,
          unit: '% rétention',
          impact: retentionDelta,
          rationale: `Réduire le churn de ${fmtNum(Math.round(churned))} clients/an dégage ${fmtCHFShort(retentionDelta)} sur le parc existant.`,
        });
      }
      // Funnel optimization (if conversion < bench)
      if (ind.conv < 0.20 || ind.closing < 0.30) {
        const funnelDelta = newAcqRev * 0.15;
        levers.push({
          id: 'funnel',
          label: 'Optimiser le funnel · +15% conversion',
          delta: 15,
          unit: '%',
          impact: funnelDelta,
          rationale: `Amélioration MQL→SQL et SQL→Won via response time, lead scoring, sales enablement.`,
        });
      }
      // Capacity lever
      if (pipelineCoverage > 0 && pipelineCoverage < 0.8 && aeQuota > 0) {
        const aesNeeded = Math.ceil((annualTarget - rampedCapacity) / (aeQuota * 0.85));
        levers.push({
          id: 'hiring',
          label: `Recruter ${aesNeeded} AE supplémentaire(s)`,
          delta: aesNeeded,
          unit: 'AE',
          impact: aesNeeded * aeQuota * 0.85 * 0.7, // discounted for ramp
          rationale: `Avec ramp ${ind.aeRampMonths} mois, capacité Y1 = 70% du quota plein.`,
        });
      }
    }

    return {
      // Profile context (echoes back)
      ind, country, lc,
      annualTarget,

      // Bottom-up snapshot
      bottomUp: {
        annual: bottomUpAnnual,
        existing: existingAnnualRev,
        newAcq:   newAcqRev,
        newCustomers,
        startingCustomers,
        churned,
        retainedYear,
      },

      // Top-down: target & gap
      topDown: {
        target: annualTarget,
        gap,
        additionalCustomers,
        additionalLeads,
        additionalBudgetMo,
      },

      // Funnel mechanics
      funnel,

      // Sales capacity
      capacity: {
        aeCount,
        aeQuota,
        rampedCapacity,
        pipelineCoverage,
        rampMonths: ind.aeRampMonths,
      },

      // Unit economics
      units: { cac, ltv, ltvCacRatio, cacPaybackMo, panier, arpuMonthly, margin },

      // MMM live state
      mmm,
      sim,

      // Diagnostics
      flags,
      levers,
    };
  }, [profile, mmmSpend, marketMix, rfmShares, target, salesAEs, retentionLift, newCustomerLift]);
}

Object.assign(window, { useRevOpsModel });
