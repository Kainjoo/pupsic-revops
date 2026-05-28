// MMM math + scenario calculator math
// All response curves: revenue(spend) = ceiling * (1 - exp(-spend / sat))
// Marginal ROAS at spend s:  dR/dS = (ceiling/sat) * exp(-s/sat)
//                                   = baseROAS * exp(-s/sat)
// where baseROAS = ceiling / sat (held consistent by channel defaults).

function channelRevenue(channel, spend) {
  if (spend <= 0) return 0;
  return channel.ceiling * (1 - Math.exp(-spend / channel.sat));
}

function channelMarginalROAS(channel, spend) {
  // dRevenue / dSpend at point `spend`
  return (channel.ceiling / channel.sat) * Math.exp(-spend / channel.sat);
}

function channelUtilization(channel, spend) {
  // 0..1 — how close to ceiling we currently sit
  return clamp(channelRevenue(channel, spend) / channel.ceiling, 0, 1);
}

const ORGANIC_UPLIFT = 0.12; // +12% on top of paid for base / organic

function computeMMM(spendByChannel) {
  let totalSpend = 0;
  let paidRevenue = 0;
  const perChannel = CHANNELS.map(c => {
    const s = Math.max(0, spendByChannel[c.id] || 0);
    const r = channelRevenue(c, s);
    totalSpend += s;
    paidRevenue += r;
    return {
      ...c,
      spend: s,
      revenue: r,
      roas: s > 0 ? r / s : 0,
      marginal: channelMarginalROAS(c, s),
      util: channelUtilization(c, s),
    };
  });
  const baseUplift = paidRevenue * ORGANIC_UPLIFT;
  const totalRevenue = paidRevenue + baseUplift;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  return { perChannel, totalSpend, paidRevenue, baseUplift, totalRevenue, roas };
}

// One step of gradient reallocation: shift `chunk` CHF from lowest- to highest-marginal-ROAS,
// constrained to non-negative spend.
function reallocStep(spendByChannel, chunk = 500) {
  const mmm = computeMMM(spendByChannel);
  // Eligible donors: spend > chunk
  const donors = mmm.perChannel.filter(c => c.spend >= chunk + 100);
  if (donors.length === 0) return null;
  const lo = donors.reduce((a, b) => (a.marginal < b.marginal ? a : b));
  const hi = mmm.perChannel.reduce((a, b) => (a.marginal > b.marginal ? a : b));
  if (lo.id === hi.id) return null;
  // If marginal ROAS already converged within 5%, stop.
  if (hi.marginal - lo.marginal < 0.05) return null;
  const next = { ...spendByChannel };
  next[lo.id] = Math.max(0, (next[lo.id] || 0) - chunk);
  next[hi.id] = (next[hi.id] || 0) + chunk;
  return { next, from: lo.id, to: hi.id };
}

// Suggestion for AI rec line (one-shot, not animated)
function suggestRealloc(spendByChannel, amount = 2000) {
  const mmm = computeMMM(spendByChannel);
  const donors = mmm.perChannel.filter(c => c.spend >= amount + 100);
  if (donors.length === 0) return null;
  const lo = donors.reduce((a, b) => (a.marginal < b.marginal ? a : b));
  const hi = mmm.perChannel.reduce((a, b) => (a.marginal > b.marginal ? a : b));
  if (lo.id === hi.id || hi.marginal - lo.marginal < 0.2) return null;
  const before = computeMMM(spendByChannel).totalRevenue;
  const next = { ...spendByChannel };
  next[lo.id] -= amount; next[hi.id] += amount;
  const after = computeMMM(next).totalRevenue;
  const gain = after - before;
  if (gain <= 0) return null;
  return { fromId: lo.id, toId: hi.id, amount, gain };
}

// ── Scenario / RevOps Calculator math ──────────────────────────────────────
// Inputs: industry (optional, defaults to saas_b2b),
//         country (optional, defaults to CH) — drives cacIndex & salaryAdj
//         lifecycle (optional, defaults to growth) — drives targets & recovery curve
//         caAnnuel, leadsMois, conversion, closing, panier, responseTimeMin, equipe,
//         revopsBudget (CHF/month — optional)
// Output: realisedRevenue, totalLeak, leakBuckets, recoveredByBudget, netMonthly, paybackMonths,
//         customer economics: newCustomers, cac, ltv, ltvCacRatio, cacPaybackMonths
function computeScenario(inp) {
  const ind = (typeof INDUSTRIES !== 'undefined' && INDUSTRIES[inp.industry]) || null;
  const country = (typeof COUNTRIES !== 'undefined' && COUNTRIES.find(c => c.id === inp.country)) || null;
  const lc = (typeof LIFECYCLES !== 'undefined' && LIFECYCLES[inp.lifecycle]) || (typeof LIFECYCLES !== 'undefined' ? LIFECYCLES.growth : null);

  // Lifecycle-adjusted benchmark targets (mature is stricter, launch looser).
  const tgtMult = lc ? lc.targetMult : 1;
  const targetConv     = (ind ? ind.conv     : 0.25) * tgtMult;
  const targetClosing  = (ind ? ind.closing  : 0.30) * tgtMult;
  const targetResponse = lc ? lc.responseTarget : 5;

  // Country cost multipliers
  const cacIdx    = country ? country.cacIndex  : 1;
  const salaryAdj = country ? country.salaryAdj : 1;

  // Margin: lifecycle override → industry default → 0.6 fallback
  const margin = lc && lc.marginOverride != null ? lc.marginOverride : (ind ? ind.margin : 0.6);

  const monthlyCA = inp.caAnnuel / 12;
  const realised = inp.leadsMois * inp.conversion * inp.closing * inp.panier;

  // 1. Response-time decay
  const rt = inp.responseTimeMin;
  const responseDecay = clamp((rt - targetResponse) / 120, 0, 0.45);
  const responseLeak = realised * (responseDecay / (1 - responseDecay));

  // 2. Closing gap to (lifecycle-adjusted) industry median
  const closingGap = Math.max(0, targetClosing - inp.closing);
  const closingLeak = inp.leadsMois * inp.conversion * closingGap * inp.panier;

  // 3. Qualification gap to (lifecycle-adjusted) industry median
  const convGap = Math.max(0, targetConv - inp.conversion);
  const convLeak = inp.leadsMois * convGap * inp.closing * inp.panier;

  // 4. Team bandwidth (capacity ~150 leads/rep, but salaryAdj reflects local pace)
  const repCapacity = Math.round(150 / clamp(salaryAdj, 0.7, 1.4));
  const overflow = Math.max(0, inp.leadsMois - inp.equipe * repCapacity);
  const bandwidthLeak = overflow * inp.conversion * inp.closing * inp.panier * 0.4;

  const totalLeak = responseLeak + closingLeak + convLeak + bandwidthLeak;
  const optimised = realised + totalLeak;
  const roi = realised > 0 ? totalLeak / realised : 0;

  // RevOps budget recovery — diminishing returns.
  // Saturation scales with company size, then with lifecycle leverage (mature teams extract more per CHF).
  const budget = Math.max(0, inp.revopsBudget || 0);
  const satMult = lc ? lc.recoverySatMult : 1;
  const sat = Math.max(800, monthlyCA * 0.006) / Math.max(0.5, satMult);
  const recoveryRatio = budget > 0 ? 1 - Math.exp(-budget / sat) : 0;
  const recovered = totalLeak * recoveryRatio;
  const netMonthly = recovered - budget;
  const paybackMonths = recovered > 0 ? budget / recovered : Infinity;
  const annualNet = netMonthly * 12;

  // ── Customer economics ────────────────────────────────────────────────
  // CAC is computed against fully-loaded RevOps spend, scaled by country CAC index.
  const newCustomers = inp.leadsMois * inp.conversion * inp.closing;
  const cac = newCustomers > 0 ? (budget * cacIdx) / newCustomers : 0;
  const ltvMult = ind ? ind.ltvMult : 2.5;
  const ltv = inp.panier * ltvMult * margin;
  const ltvCacRatio = cac > 0 ? ltv / cac : Infinity;
  // CAC payback in months at current ACV pace (panier × margin per acquisition period of 1 mo)
  const monthlyContribPerCustomer = inp.panier * margin / 12; // amortised across a year of contribution
  const cacPaybackMonths = cac > 0 && monthlyContribPerCustomer > 0 ? cac / monthlyContribPerCustomer : 0;

  // Health vs lifecycle targets
  const ltvCacTarget = lc ? lc.ltvCacTarget : 3;
  const cacPaybackTarget = lc ? lc.cacPaybackTargetMo : 12;
  const ltvCacHealth = ltvCacRatio === Infinity ? 'na'
                      : ltvCacRatio >= ltvCacTarget ? 'ok'
                      : ltvCacRatio >= ltvCacTarget * 0.7 ? 'warn' : 'bad';
  const cacPaybackHealth = cac === 0 ? 'na'
                          : cacPaybackMonths <= cacPaybackTarget ? 'ok'
                          : cacPaybackMonths <= cacPaybackTarget * 1.5 ? 'warn' : 'bad';

  return {
    monthlyCA, realised, optimised, totalLeak, industry: ind, country, lifecycle: lc,
    buckets: [
      { id: 'response', label: 'Temps de réponse', value: responseLeak,
        hint: `Délai actuel ${rt} min · cible ${targetResponse} min (${lc ? lc.name : '—'})` },
      { id: 'closing', label: 'Taux de closing', value: closingLeak,
        hint: `Closing actuel ${fmtPct(inp.closing)} · cible ${fmtPct(targetClosing)} (${lc ? lc.name : '—'})` },
      { id: 'conv', label: 'Qualification leads', value: convLeak,
        hint: `Conversion lead→opp ${fmtPct(inp.conversion)} · cible ${fmtPct(targetConv)} (${lc ? lc.name : '—'})` },
      { id: 'bandwidth', label: 'Bande passante équipe', value: bandwidthLeak,
        hint: `${inp.leadsMois} leads / ${inp.equipe} commerciaux · ratio cible ${repCapacity}` },
    ],
    roi,
    // Budget impact
    budget, recovered, recoveryRatio, netMonthly, paybackMonths, annualNet, sat,
    // Customer economics
    newCustomers, cac, ltv, ltvCacRatio, cacPaybackMonths,
    ltvCacTarget, cacPaybackTarget, ltvCacHealth, cacPaybackHealth, margin, cacIdx,
  };
}

Object.assign(window, {
  channelRevenue, channelMarginalROAS, channelUtilization,
  computeMMM, reallocStep, suggestRealloc, computeScenario,
  simulateTopLine,
  ORGANIC_UPLIFT,
});

// ─── Revenue Simulator math ────────────────────────────────────────────────
// Project 12 months of top-line revenue under a given:
//   spendByChannel : per-channel monthly CHF budget
//   marketMix      : { vaud, switzerland, others }   (normalised to 1)
//   rfmShares      : { champions, loyal, casual, at_risk } (normalised to 1)
//   panier         : avg revenue per active customer per "unit of monthlyValueMult"
//   startingCustomers: existing base count
//   retentionLift  : multiplier on each segment's monthly retention (cap at 0.995)
//   newCustomerLift: multiplier on channel-driven new customers (RevOps efficacy)
//   horizonMonths  : default 12
//
// Returns:
//   months[]   : per-month object { idx, label,
//                  existingRev, newRev, totalRev,
//                  existingCustomers, newCustomers, totalCustomers,
//                  perChannel: [{id, hue, revenue}], perMarket: [{id, revenue}],
//                  perSegment: [{id, count, revenue}] }
//   totals     : aggregate over horizon
function simulateTopLine({
  spendByChannel,
  marketMix    = { vaud: 0.45, switzerland: 0.45, others: 0.10 },
  rfmShares,
  panier,
  arpuMonthly,  // monthly revenue per active customer (panier amortised)
  startingCustomers = 320,
  retentionLift     = 1.0,
  newCustomerLift   = 1.0,
  horizonMonths     = 12,
}) {
  const mkts = (typeof MARKETS !== 'undefined' && MARKETS) || {};
  const segs = (typeof RFM_SEGMENTS !== 'undefined' && RFM_SEGMENTS) || [];

  // Default arpuMonthly to panier/12 if unknown (assumes panier = annual ACV).
  const arpu = arpuMonthly > 0 ? arpuMonthly : (panier > 0 ? panier / 12 : 0);

  // Normalise market mix
  const mixSum = Object.values(marketMix).reduce((a, b) => a + b, 0) || 1;
  const mix = Object.fromEntries(Object.entries(marketMix).map(([k, v]) => [k, v / mixSum]));

  // Normalise RFM shares
  const rfmIn = rfmShares || segs.reduce((acc, s) => { acc[s.id] = s.share; return acc; }, {});
  const rfmSum = Object.values(rfmIn).reduce((a, b) => a + b, 0) || 1;
  const rfm = Object.fromEntries(Object.entries(rfmIn).map(([k, v]) => [k, v / rfmSum]));

  // Initialise existing base across RFM segments
  let segmentCounts = segs.map(s => ({
    id: s.id, hue: s.hue, mult: s.monthlyValueMult,
    retention: clamp(s.retentionMonthly * retentionLift, 0.05, 0.995),
    count: startingCustomers * (rfm[s.id] || 0),
  }));

  // Pre-compute per-channel monthly new-customer yield against MMM curves.
  // Map channel revenue at this spend → customer count via average panier (ACV).
  // Each customer then contributes arpuMonthly in the months they're active
  // (channel revenue itself is the year-1 ACV-equivalent attribution).
  const channels = (typeof CHANNELS !== 'undefined' && CHANNELS) || [];
  const channelYield = channels.map(c => {
    const spend = Math.max(0, spendByChannel?.[c.id] || 0);
    const revAtSpend = channelRevenue(c, spend);
    // Customers reachable from this channel this month (ACV-attributed)
    const baseCustomers = panier > 0 ? revAtSpend / panier : 0;
    return { ...c, spend, baseCustomers };
  });

  const months = [];

  for (let m = 0; m < horizonMonths; m++) {
    // ── Existing base: monthly contribution via ARPU (not annual panier) ──
    // BUG FIX: previously s.count * s.mult * panier per month → 12× over-count.
    // Now: s.count * s.mult * arpuMonthly per month. arpu is the panier amortised
    // across the customer's typical purchase cycle.
    let existingCustomers = 0;
    let existingRev = 0;
    const perSegment = segmentCounts.map(s => {
      const monthRev = s.count * s.mult * arpu;
      existingCustomers += s.count;
      existingRev += monthRev;
      return { id: s.id, count: s.count, revenue: monthRev };
    });

    // ── New customers from channels × markets ──
    // Newly-acquired customers contribute arpu (monthly) in the month of acquisition;
    // they roll into the RFM base for subsequent months.
    let newCustomers = 0;
    let newRev = 0;
    const perChannel = [];
    const perMarket = MARKET_ORDER.map(id => ({ id, revenue: 0, customers: 0 }));
    const marketByIdx = Object.fromEntries(perMarket.map((m, i) => [m.id, i]));

    for (const ch of channelYield) {
      let chCustomers = 0;
      let chRev = 0;
      for (const mid of MARKET_ORDER) {
        const mk = mkts[mid];
        const share = mix[mid] || 0;
        // Customers landing in this market from this channel (per month)
        const cust = ch.baseCustomers * share * newCustomerLift / (mk?.cacMultiplier || 1);
        // Penetration ceiling: cannot exceed the gap to addressable
        const penFactor = 1 - clamp((mk?.penetration || 0), 0, 0.9);
        const realCust  = cust * penFactor;
        // Month-1 contribution = ARPU per customer (annual revenue accumulates via base roll-fwd)
        // Small organic uplift bonus by market (proximity / earned)
        const upliftRev = realCust * arpu * (1 + (mk?.organicMonthlyShare || 0));
        chCustomers += realCust;
        chRev       += upliftRev;
        const idx = marketByIdx[mid];
        if (idx !== undefined) {
          perMarket[idx].customers += realCust;
          perMarket[idx].revenue   += upliftRev;
        }
      }
      perChannel.push({ id: ch.id, name: ch.name, hue: ch.hue, customers: chCustomers, revenue: chRev });
      newCustomers += chCustomers;
      newRev       += chRev;
    }

    const totalRev       = existingRev + newRev;
    const totalCustomers = existingCustomers + newCustomers;

    // ── Roll forward: apply retention BEFORE adding new joiners (track churn) ──
    let churnedCustomers = 0;
    segmentCounts = segmentCounts.map(s => {
      const retained = s.count * s.retention;
      churnedCustomers += (s.count - retained);
      return { ...s, count: retained };
    });

    months.push({
      idx: m,
      label: `M${m + 1}`,
      existingRev, newRev, totalRev,
      existingCustomers, newCustomers, totalCustomers, churnedCustomers,
      perChannel, perMarket, perSegment,
      segmentSnapshot: segmentCounts.map(s => ({ id: s.id, count: s.count })),
    });

    // ── Enrol new customers (year-1 cohort goes to LOYAL @ mult 1.0, not CASUAL @ 0.55) ──
    // A freshly-acquired customer who paid `panier` in M1 generates full ARPU per
    // month for the rest of Y1, not the discounted casual rate. They graduate / decay
    // into other segments after year 1 in a real CRM — within this 12-mo horizon we
    // treat them as loyal-tier active customers.
    const idxCasual    = segmentCounts.findIndex(s => s.id === 'casual');
    const idxLoyal     = segmentCounts.findIndex(s => s.id === 'loyal');
    const idxChampions = segmentCounts.findIndex(s => s.id === 'champions');
    if (idxLoyal >= 0) segmentCounts[idxLoyal].count += newCustomers;
    // Small champion promo from loyal pool (top performers within year)
    if (idxLoyal >= 0 && idxChampions >= 0) {
      const promo = segmentCounts[idxLoyal].count * 0.02;
      segmentCounts[idxLoyal].count    -= promo;
      segmentCounts[idxChampions].count += promo;
    }
    // Decay from loyal → casual (modest, captures Y1 cohort behavioural drift)
    if (idxLoyal >= 0 && idxCasual >= 0) {
      const decay = segmentCounts[idxLoyal].count * 0.015;
      segmentCounts[idxLoyal].count  -= decay;
      segmentCounts[idxCasual].count += decay;
    }
  }

  // Aggregate totals across horizon
  const totalRev          = months.reduce((a, m) => a + m.totalRev, 0);
  const totalExistingRev  = months.reduce((a, m) => a + m.existingRev, 0);
  const totalNewRev       = months.reduce((a, m) => a + m.newRev, 0);
  const totalSpend        = horizonMonths * Object.values(spendByChannel || {}).reduce((a, b) => a + (b || 0), 0);
  const totalNewCustomers = months.reduce((a, m) => a + m.newCustomers, 0);
  const blendedROAS       = totalSpend > 0 ? totalRev / totalSpend : 0;
  const blendedCAC        = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0;

  // Per-market totals
  const marketTotals = MARKET_ORDER.map(id => {
    const r = months.reduce((a, m) => a + (m.perMarket.find(x => x.id === id)?.revenue || 0), 0);
    const c = months.reduce((a, m) => a + (m.perMarket.find(x => x.id === id)?.customers || 0), 0);
    return { id, revenue: r, customers: c };
  });
  // Per-channel totals (new revenue only)
  const channelTotals = channels.map(c => {
    const r = months.reduce((a, m) => a + (m.perChannel.find(x => x.id === c.id)?.revenue || 0), 0);
    return { id: c.id, name: c.name, hue: c.hue, revenue: r };
  });

  return {
    months, totals: {
      totalRev, totalExistingRev, totalNewRev,
      totalSpend, totalNewCustomers, blendedROAS, blendedCAC,
      marketTotals, channelTotals,
    },
  };
}
