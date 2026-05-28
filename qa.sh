#!/usr/bin/env bash
# qa.sh — Pre-push quality check for Pupsic RevOps prototype
# Run directly:  ./qa.sh
# Returns: 0 = all clear, 1 = failures found (blocks push)

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=()

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; ERRORS+=("$1"); }
section() { echo -e "\n${CYAN}── $1 ──${NC}"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pupsic RevOps · Pre-push QA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Required files ────────────────────────────
section "File presence & size"
REQUIRED=(
  "index.html"
  "CNAME"
  "src/lib.jsx"
  "src/icons.jsx"
  "src/mmm-math.jsx"
  "src/revops-model.jsx"
  "src/shell.jsx"
  "src/expert-shell.jsx"
  "src/auth.jsx"
  "src/pricing.jsx"
  "src/dashboard.jsx"
  "src/calculator.jsx"
  "src/mmm.jsx"
  "src/media-plan.jsx"
  "src/simulator.jsx"
  "src/rfm.jsx"
  "src/trials.jsx"
  "src/integrations.jsx"
  "src/cockpit.jsx"
  "src/waitlist.jsx"
  "src/plan-charts.jsx"
  "src/brand-planner.jsx"
  "src/account.jsx"
  "src/onboarding.jsx"
  "src/app.jsx"
)
for f in "${REQUIRED[@]}"; do
  FPATH="$PROJECT_DIR/$f"
  if [[ ! -f "$FPATH" ]]; then
    err "$f — MISSING"
  else
    BYTES=$(wc -c < "$FPATH" | tr -d ' ')
    if [[ "$BYTES" -lt 10 ]]; then
      err "$f — empty or near-empty ($BYTES bytes)"
    else
      ok "$f  ($BYTES bytes)"
    fi
  fi
done

# ── 2. CNAME guard ───────────────────────────────
section "Custom domain"
CNAME_VAL=$(cat "$PROJECT_DIR/CNAME" 2>/dev/null | tr -d '[:space:]')
if [[ "$CNAME_VAL" == "revops.kjoo.io" ]]; then
  ok "CNAME = revops.kjoo.io"
else
  err "CNAME is '${CNAME_VAL}' — expected 'revops.kjoo.io' (domain will break)"
fi

# ── 3. index.html integrity ──────────────────────
section "index.html integrity"
INDEX="$PROJECT_DIR/index.html"

# Title tag
if grep -q '<title>Pupsic' "$INDEX"; then
  ok "Title tag: $(grep -o '<title>[^<]*</title>' "$INDEX" | head -1)"
else
  err "Title tag missing or wrong"
fi

# Brand colour (accent)
if grep -q "'#8D0AF5'\|\"#8D0AF5\"\|8D0AF5" "$INDEX"; then
  ok "Brand accent colour #8D0AF5 present"
else
  warn "Brand accent colour #8D0AF5 not found in index.html"
fi

# Script tags for every src module
MODULES=(lib icons mmm-math revops-model shell expert-shell auth pricing dashboard calculator mmm media-plan simulator rfm trials integrations cockpit waitlist plan-charts brand-planner account onboarding app)
for m in "${MODULES[@]}"; do
  if grep -q "src=\"src/${m}.jsx\"" "$INDEX"; then
    ok "Script tag: src/${m}.jsx"
  else
    err "Script tag missing: src/${m}.jsx"
  fi
done

# CDN integrity
for cdn in "tailwindcss" "react@18" "recharts" "babel/standalone"; do
  if grep -q "$cdn" "$INDEX"; then
    ok "CDN: $cdn"
  else
    err "CDN missing: $cdn"
  fi
done

# Montserrat weight 300 must be loaded (display headings match pupsic.ch)
if grep -q "Montserrat:wght@.*300" "$INDEX"; then
  ok "Montserrat weight 300 loaded"
else
  err "Montserrat weight 300 missing from Google Fonts URL — display headings will use fallback weight"
fi

# mute colour should be the brand-aligned neutral (#87848f), not the old purple-cast #6e6a85
if grep -q "87848f\|87848F" "$INDEX"; then
  ok "mute colour #87848f (brand-aligned neutral)"
elif grep -q "6e6a85\|6E6A85" "$INDEX"; then
  err "mute colour is #6e6a85 (too purple vs pupsic.ch) — update to #87848f"
else
  warn "mute colour not found in index.html — check Tailwind config"
fi

# display class should use weight 300 and tight letter-spacing
if grep -q "font-weight: 300" "$INDEX"; then
  ok ".display uses font-weight 300 (matches pupsic.ch H1/H2)"
else
  err ".display font-weight is not 300 — large headings won't match brand"
fi
if grep -q "letter-spacing: -0.04em" "$INDEX"; then
  ok ".display letter-spacing -0.04em (matches pupsic.ch tight headings)"
else
  err ".display letter-spacing is not -0.04em — headings won't match brand tracking"
fi

# ── 4. JSX sanity checks ─────────────────────────
section "JSX sanity"

for f in "$PROJECT_DIR"/src/*.jsx; do
  FNAME=$(basename "$f")
  LINES=$(wc -l < "$f" | tr -d ' ')
  if [[ "$LINES" -lt 5 ]]; then
    err "src/$FNAME — suspiciously short ($LINES lines)"
  else
    ok "src/$FNAME — $LINES lines"
  fi
done

# app.jsx must contain root render
if grep -q "root\.render\|createRoot" "$PROJECT_DIR/src/app.jsx"; then
  ok "app.jsx — ReactDOM.createRoot render present"
else
  err "app.jsx — root.render / createRoot missing (app won't mount)"
fi

# lib.jsx must export to window
if grep -q "Object\.assign(window" "$PROJECT_DIR/src/lib.jsx"; then
  ok "lib.jsx — window exports present"
else
  err "lib.jsx — Object.assign(window,...) missing (module chain broken)"
fi

# shell.jsx must export to window
if grep -q "Object\.assign(window" "$PROJECT_DIR/src/shell.jsx"; then
  ok "shell.jsx — window exports present"
else
  err "shell.jsx — Object.assign(window,...) missing"
fi

# app.jsx should NOT export to window (it's the root)
if grep -q "Object\.assign(window" "$PROJECT_DIR/src/app.jsx"; then
  warn "app.jsx — unexpected Object.assign(window,...) (not necessarily wrong)"
fi

# ── 5. HTTP smoke test ───────────────────────────
section "HTTP smoke test (local)"
SMOKE_PORT=18099

if ! command -v python3 &>/dev/null; then
  warn "python3 not found — skipping smoke test"
else
  # Kill any stale server on that port
  lsof -ti tcp:$SMOKE_PORT | xargs kill -9 2>/dev/null || true

  python3 -m http.server $SMOKE_PORT --directory "$PROJECT_DIR" \
    --bind 127.0.0.1 &>/dev/null &
  SERVER_PID=$!
  sleep 1

  # curl -w "%{http_code}" writes "000" on connection failure — don't add || echo "000" (doubles it)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$SMOKE_PORT/" 2>/dev/null)
  BODY=$(curl -s "http://127.0.0.1:$SMOKE_PORT/" 2>/dev/null)
  TITLE=$(echo "$BODY" | grep -o '<title>[^<]*</title>' | head -1)
  LIB_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$SMOKE_PORT/src/lib.jsx" 2>/dev/null)

  # Done with server — kill now
  kill $SERVER_PID 2>/dev/null || true
  lsof -ti tcp:$SMOKE_PORT | xargs kill -9 2>/dev/null || true

  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "HTTP 200 on localhost:$SMOKE_PORT"
  else
    err "HTTP ${HTTP_CODE:-000} on localhost:$SMOKE_PORT (expected 200)"
  fi

  if echo "$TITLE" | grep -q "Pupsic"; then
    ok "Page title: $TITLE"
  else
    err "Page title wrong or missing: '${TITLE:-<empty>}'"
  fi

  if [[ "$LIB_CODE" == "200" ]]; then
    ok "src/lib.jsx served OK"
  else
    err "src/lib.jsx returns HTTP ${LIB_CODE:-000}"
  fi
fi

# ── Summary ──────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo -e "${GREEN}  ✓  All checks passed — safe to push${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 0
else
  echo -e "${RED}  ✗  ${#ERRORS[@]} check(s) failed — push blocked${NC}"
  for e in "${ERRORS[@]}"; do
    echo -e "  ${RED}•${NC} $e"
  done
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 1
fi
