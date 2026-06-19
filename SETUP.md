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
- Replace **`[add registration number]`** with Dr David Kozor's AHPRA registration number (3 places: the before/after disclaimer, the mobile legal block, and the footer).
- The `From` domain (`horizondental.com.au`) should be verified as a sender in SMTP2GO for best deliverability.
