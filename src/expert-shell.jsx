// Expert shell — shared layout primitives for Dashboard, Simulator, Cockpit.
// Strict 3-size type scale enforced via .t-hero / .t-num / .t-body / .t-caption.
//   t-hero    (36px) — primary outcome, ONE per screen
//   t-num     (20px) — KPI values
//   t-body    (12px) — body, labels, sub-copy
//   t-caption (10.5px mono) — eyebrows & overlines
// Color rule: only ink / mute / accent on numbers. No warn/bad/ok in t-hero/t-num
// positions — encode status as small dots, not as colored numbers.

// ── Header ─────────────────────────────────────────────────────────────
function ExpertHeader({ eyebrow, title, lead, crossLinks = [] }) {
  return (
    <div className="mb-7">
      <div className="t-caption text-mute">{eyebrow}</div>
      <h1 className="t-hero text-ink mt-2 max-w-[820px]" style={{ fontSize: 'clamp(24px, 3.2vw, 32px)', lineHeight: 1.15 }}>
        {title}
      </h1>
      {lead && (
        <p className="t-body text-mute mt-3 max-w-[680px]">
          {lead}
        </p>
      )}
      {crossLinks.length > 0 && (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="t-caption text-mute">Voir aussi</span>
          {crossLinks.map((link, i) => (
            <React.Fragment key={link.label}>
              {i > 0 && <span className="text-line">·</span>}
              <button onClick={link.onClick}
                      className="t-body text-ink hover:text-accent underline underline-offset-2 decoration-line transition-colors">
                {link.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Outcome strip ──────────────────────────────────────────────────────
// Flat layout — no Card chrome. Sections separated by hairlines.
function OutcomeStrip({ primary, kpis = [], tone = 'accent' }) {
  const toneClass = tone === 'accent' ? 'text-accent' : 'text-ink';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-12 pb-12 mb-12 border-b hair items-start">
      {/* Primary outcome */}
      <div>
        <div className="t-caption text-mute">{primary.label}</div>
        <div className={cn('t-hero mt-3 whitespace-nowrap', toneClass)}>
          <AnimNum value={primary.value} format={primary.format || fmtCHFShort} />
        </div>
        {primary.sub && (
          <div className="t-body text-mute mt-3 max-w-[420px]">{primary.sub}</div>
        )}
      </div>

      {/* Supporting KPIs — 2×2 grid with hairline dividers, no card */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {kpis.slice(0, 4).map((k, i) => (
          <div key={i} className="border-b hair pb-3">
            <div className="t-caption text-mute">{k.label}</div>
            <div className="t-num text-ink mt-2">
              <AnimNum value={k.value} format={k.format || fmtCHFShort} />
            </div>
            {k.sub && (
              <div className="t-body text-mute mt-1.5 truncate">{k.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attribution panel ──────────────────────────────────────────────────
// Flat layout — no Card chrome.
function AttributionPanel({ title, lead, items = [], total, format = fmtCHFShort, suffixLabel = '' }) {
  const sum = total != null ? total : items.reduce((a, b) => a + (b.value || 0), 0);
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  return (
    <div className="pb-12 mb-12 border-b hair">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="t-bodyhi text-ink">{title}</div>
          {lead && <div className="t-caption text-mute mt-1">{lead}</div>}
        </div>
      </div>
      <div className="divide-y hair -mx-1">
        {sorted.map((it, i) => {
          const share = sum > 0 ? it.value / sum : 0;
          return (
            <div key={it.id || i} className="px-1 py-2.5 grid grid-cols-[20px_10px_1fr_160px_110px] items-center gap-4">
              <span className="t-caption text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="w-1.5 h-1.5 shrink-0" style={{ background: it.hue || '#bfbacf' }} />
              <div className="min-w-0">
                <div className="t-body text-ink truncate">{it.label}</div>
                {it.hint && <div className="t-caption text-mute mt-1 truncate">{it.hint}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-[3px] bg-line2 relative overflow-hidden flex-1">
                  <div className="h-full" style={{ width: `${share * 100}%`, background: it.hue || '#131022',
                                                   transition: 'width 320ms cubic-bezier(.4,0,.2,1)' }} />
                </div>
                <span className="t-caption text-mute tabular-nums shrink-0">{fmtPct(share, 0)}</span>
              </div>
              <div className="text-right t-body text-ink num tabular-nums">
                {format(it.value)}{suffixLabel && <span className="text-mute t-caption ml-0.5">{suffixLabel}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Action card ────────────────────────────────────────────────────────
// Flat layout — single hairline border, no Card chrome.
function ActionCard({ eyebrow = 'Action recommandée', title, copy, primary, secondary }) {
  return (
    <div className="pb-12 mb-12 border-b hair flex items-start gap-4">
      <div className="w-8 h-8 inline-flex items-center justify-center border hair bg-paper shrink-0 mt-0.5">
        <IconSpark size={13} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="t-caption text-accent">{eyebrow}</div>
        <div className="t-bodyhi mt-1.5 max-w-[720px] text-ink">
          {title}
        </div>
        {copy && (
          <p className="t-body text-mute mt-1.5 max-w-[720px]">{copy}</p>
        )}
        {(primary || secondary) && (
          <div className="mt-3.5 flex items-center gap-2">
            {primary && (
              <Button variant="primary" size="sm" onClick={primary.onClick} iconRight={<IconArrowRight size={13} />}>
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button variant="ghost" size="sm" onClick={secondary.onClick}>
                {secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section title (for module body) ────────────────────────────────────
function ExpertSection({ title, lead, trailing, children, className }) {
  return (
    <div className={cn('mb-3', className)}>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="t-bodyhi">{title}</div>
          {lead && <div className="t-body text-mute mt-0.5">{lead}</div>}
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { ExpertHeader, OutcomeStrip, AttributionPanel, ActionCard, ExpertSection });
