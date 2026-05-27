# Pupsic — RevOps & MMM

Static React prototype for the Pupsic RevOps calculator, MMM and media planner.

## Run locally

The prototype loads React, Tailwind, Recharts and Babel-standalone from CDNs and uses in-browser JSX transpilation, so it needs a real HTTP server (not `file://`).

```sh
# pick any static server
python3 -m http.server 8080
# or
npx serve .
```

Then open http://localhost:8080.

Login with **Utiliser le compte démo** (or any email + non-empty password) to land on a populated Growth-tier dashboard.

## Deploy

Drag the folder onto any static host:

- **Netlify Drop** — https://app.netlify.com/drop (instant public URL)
- **Cloudflare Pages** — `npx wrangler pages deploy .`
- **Vercel** — `npx vercel`
- **GitHub Pages** — push to a repo, enable Pages

## Structure

```
index.html      # entry — Tailwind config, CDN imports, root mount
src/
  lib.jsx        # formatters, plan tiers, industry/country/lifecycle, primitives
  icons.jsx      # SVG icon set
  mmm-math.jsx   # response curves, optimiser
  shell.jsx     # nav, footer, demo banner, gated-feature panel
  auth.jsx      # login / signup screens + hero chart
  pricing.jsx   # three-tier plan picker + mock Stripe modal
  dashboard.jsx # KPIs, quick actions, RevOps score gauge
  calculator.jsx# 7-input pipeline calculator with leak breakdown
  mmm.jsx       # 8-channel marketing mix model
  media-plan.jsx# 12-month editable spend grid
  account.jsx   # plan + seats + cancellation
  onboarding.jsx# 5-step profile + maturity wizard
  app.jsx       # router + demo state + root render
```

Each module assigns its exports onto `window` so the next `<script type="text/babel">` tag can use them; load order in `index.html` matters.

© Pupsic · A Kainjoo SA venture
