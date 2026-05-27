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
  ORGANIC_UPLIFT,
});
