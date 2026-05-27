# Pupsic RevOps — Claude instructions

## Project overview
Static React prototype. No build step. React 18 + Tailwind + Recharts + Babel are loaded from CDN.
JSX files in `src/` are transpiled in-browser; each file dumps exports onto `window` (load order in index.html matters).

Live at: **https://revops.kjoo.io/** (GitHub Pages → Kainjoo/pupsic-revops, main branch)
Custom domain CNAME: `revops.kjoo.io` — **never overwrite or delete the `CNAME` file**.

## MANDATORY: run QA before every push

Before running any `git push`, always run:
```bash
bash qa.sh
```
The script must exit 0 before you push. If it exits 1, fix the failures first.

The git pre-push hook (`/.git/hooks/pre-push`) calls this automatically, but call it explicitly too so failures are visible in the conversation.

## QA checks performed by qa.sh
1. All 15 required files present and non-empty
2. `CNAME` contains exactly `revops.kjoo.io`
3. `index.html` has correct title, all 13 `<script type="text/babel">` tags, and all CDN imports
4. All `src/*.jsx` files are >5 lines (truncation guard)
5. `app.jsx` contains `createRoot` / `root.render`
6. `lib.jsx` and `shell.jsx` have `Object.assign(window,...)` exports
7. Local HTTP smoke test: starts `python3 -m http.server 18099`, verifies HTTP 200, correct `<title>`, and `src/lib.jsx` served OK

## Pushing to production
```bash
# 1. Run QA (must pass)
bash qa.sh

# 2. Stage and commit
git add -A
git commit -m "describe what changed"

# 3. Push (requires a fresh GitHub PAT with repo scope)
git push https://<GITHUB_PAT>@github.com/Kainjoo/pupsic-revops.git main
# Revoke the PAT at https://github.com/settings/tokens after pushing
```
GitHub Pages rebuilds within ~60 s. Cert and custom domain stay intact as long as CNAME is present.

## Updating from a Claude Design export
1. Export the new bundle from Claude Design (downloads a `.tar.gz`)
2. Extract: `tar -xzf ~/Downloads/pupsic-revops-*.tar.gz -C /tmp/new-design/`
3. Copy changed files: `cp /tmp/new-design/project/src/*.jsx src/` (and `index.html` if changed)
4. **Do NOT copy over CNAME** — the export bundle doesn't include it, but a full `cp -r` could delete it
5. Run `bash qa.sh` and fix any failures
6. Commit and push

## Brand tokens (Tailwind + CSS)
| Token       | Hex       | Use                        |
|-------------|-----------|----------------------------|
| `accent`    | `#8D0AF5` | Primary CTA, active states |
| `pink`      | `#FD89FF` | Secondary accent           |
| `ink`       | `#131022` | Body text, headings        |
| `paper`     | `#fafafd` | Page background            |
| `mute`      | `#6e6a85` | Secondary text             |
| `deep`      | `#3E0CB7` | Deep purple accent         |

Font: Montserrat (all weights). Number formatting: Swiss apostrophe (`1'234.56`).

## Architecture notes
- Script load order in `index.html` is the dependency graph — don't reorder
- Each module does `Object.assign(window, { Comp1, Comp2, ... })` at the bottom
- `src/app.jsx` is the root — it calls `ReactDOM.createRoot(...).render(<App />)` and does NOT export to window
- Plan tiers: `starter` (CHF 30) → `growth` (CHF 99) → `pro` (CHF 299)
- Demo login: click "Utiliser le compte démo" — lands on Growth-tier populated dashboard
