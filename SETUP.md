# Horizon Dental — Veneers Landing Page

Single-page liquid-glass landing page for Horizon Dental, focused on dental veneers.
Desktop = vertical scroll with a side progress nav. Mobile = horizontal swipe deck.
Form submissions are emailed to your CRM intake address by the included serverless relay.

## Files
```
index.html        the whole site (HTML + CSS + JS in one file)
api/lead.js        serverless relay — emails the form to your CRM via SMTP2GO
package.json
logo.svg           olive wordmark (light backgrounds / footer)
logo-light.svg     cream wordmark (dark top bar)
before-after-1..10.webp
dr-david.webp, reception.webp, waiting-room.webp
```

## Deploy (GitHub → Vercel)
1. Push every file to the repo, **keeping `lead.js` inside an `api/` folder** (so Vercel exposes it at `/api/lead`).
2. Import the repo in Vercel (zero-config — no build step needed).
3. Add the environment variables below, then redeploy.

### Test the function is live
`GET https://YOURSITE/api/lead` should return:
```json
{"ok":false,"error":"Method not allowed"}
```
That JSON = the relay is deployed. A **404** means `lead.js` isn't inside an `api/` folder.

## Environment variables (Vercel → Settings → Environment Variables)
| Variable | Required | Notes |
|---|---|---|
| `SMTP2GO_API_KEY` | ✅ | Your SMTP2GO API key (`api-…`). You can reuse the same SMTP2GO account as the other sites. |
| `INTAKE_ADDRESS` | ✅ | Where leads are emailed — **Horizon's SmileOx intake address**. |
| `SMTP_FROM` | optional | From header. Default: `Horizon Dental <no-reply@horizondental.com.au>` |
| `ALLOW_ORIGIN` | optional | CORS origin. Default `*` (same-origin needs nothing). |

## Before going fully live
- ✅ AHPRA registration (DEN0001855548) is now filled in all 3 places — the before/after disclaimer, the mobile legal block, and the footer — on both variants.
- The full before/after disclaimer (treatments combination, 6 weeks–12+ months timeframe, risks, second-opinion advice) now sits directly under the before/after gallery on both pages.
- The "Real Smiles. Real Results." section pulls the four patient photos from `horizon.gya.net.au/wp-content/uploads/2026/07/` — keep those files live at those URLs (or swap the `src`s to local copies).
- The `From` domain (`horizondental.com.au`) should be verified as a sender in SMTP2GO for best deliverability.
- `waiting-room.webp` is still referenced by both pages (clinic section) — keep your existing copy of that file alongside these.

## A/B test — two landing pages
This repo contains two variants. The floating "⇄" switch button has been removed — the pages now cross-link only via a discrete text link at the very end of the footer copyright line ("Pricing edition" / "Classic edition"), also shown in the mobile legal block.

| File | URL (Vercel) | Focus |
|---|---|---|
| `index.html` | `/` | **Variant A (control)** — benefit/preview-led hero, no price table |
| `b.html` | `/b` | **Variant B** — price-led hero + a fixed-price packages table under the banner ($7,900 / $8,900 / $9,900; weekly via ZipMoney) |

Both share the same images, `api/lead.js`, and form (both submit to `/api/lead`). Deploy the whole folder as-is; both pages work immediately.

To run the split test, send traffic to `/` and `/b` (e.g. via your ad platform's rotation, a Vercel rewrite/Edge split, or any A/B tool). Both pages are `noindex` so they won't create duplicate-content issues.

## Note on the flat zip
All files are supplied in a single flat folder (no subfolders). If deploying to Vercel, `lead.js` still needs to sit inside an `api/` folder in the repo so it's exposed at `/api/lead` — move it there after upload (everything else stays at the root).
