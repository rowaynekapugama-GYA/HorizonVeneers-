// api/lead.js — Horizon Dental lead relay (Vercel serverless function)
// ---------------------------------------------------------------------------
// Receives the booking-form POST from the veneers landing pages and forwards it
// to the SmileOx CRM intake as a JSON email (plain-text body), per the SmileOx
// "Integrate Website Form Intake" spec. Delivery is via the SMTP2GO HTTP API,
// which transmits to the recipient mail server over TLS.
//
// SmileOx intake behaviour:
//   • The email BODY must be a JSON object as plain text (Content-Type: text/plain).
//   • Core fields: firstName, lastName, email, phoneNumber. Any additional
//     fields (smileGoals, suitability, source, …) are stored as lead details.
//   • Repeat submissions with the same email + phone UPDATE the existing lead
//     instead of creating a duplicate (useful for multi-step forms).
//
// SET THESE as Environment Variables in Vercel, then redeploy:
//   Project → Settings → Environment Variables
//
//   SMTP2GO_API_KEY   (optional)  Overrides the built-in SMTP2GO API key
//   INTAKE_ADDRESS    (optional)  Defaults to the SmileOx veneers intake below.
//   SMTP_FROM         (optional)  From header. Default: Horizon Dental <no-reply@horizondental.com.au>
//   ALLOW_ORIGIN      (optional)  CORS origin. Default: "*" (same-origin needs nothing)
//
// Quick test once deployed:  GET https://YOURSITE/api/lead  →  {"ok":false,"error":"Method not allowed"}
// (That JSON means the function is live. A 404 means it isn't deployed in an /api folder.)
// After a real test submit, verify the lead appears in the SmileOx pipeline
// with every field intact.
// ---------------------------------------------------------------------------

const DEFAULT_INTAKE =
  "veneers-fb-ad-landing-page+243d19bc-3935-4949-976d-5dd12525eef2@intake.smileox.com.au";

// SMTP2GO API key. Baked in as a fallback so the relay works with zero Vercel
// config; the SMTP2GO_API_KEY env var still overrides it (set the env var and
// remove this default if the repo is ever shared beyond GYA).
const SMTP2GO_KEY = process.env.SMTP2GO_API_KEY || "api-83934900C27E40AEB580004F2897AE4F";

module.exports = async (req, res) => {
  const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  // ---- parse body (Vercel usually parses JSON; be defensive) ----
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  // ---- honeypot: pretend success, send nothing ----
  if (body.company) { res.status(200).json({ ok: true }); return; }

  // ---- required configuration ----
  const API_KEY = SMTP2GO_KEY;
  const TO = process.env.INTAKE_ADDRESS || DEFAULT_INTAKE;
  const FROM = process.env.SMTP_FROM || "Horizon Dental <no-reply@horizondental.com.au>";

  // ---- assemble the SmileOx JSON payload ----
  // Core fields first, then pass through any extra scalar fields the form
  // sent (smileGoals, suitability, source, …) — SmileOx stores them as lead
  // details. The honeypot field is never forwarded.
  const v = (k) => (body[k] == null ? "" : String(body[k]).trim());
  const payload = {
    firstName: v("firstName"),
    lastName: v("lastName"),
    email: v("email"),
    phoneNumber: v("phoneNumber")
  };
  for (const key of Object.keys(body)) {
    if (key === "company" || payload[key] !== undefined) continue;
    const val = body[key];
    if (val == null) continue;
    payload[key] = typeof val === "string" ? val.trim() : val;
  }
  payload.submittedAt = new Date().toISOString();

  // ---- send via SMTP2GO HTTP API (plain-text JSON body only) ----
  try {
    const r = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Smtp2go-Api-Key": API_KEY },
      body: JSON.stringify({
        api_key: API_KEY,
        to: [TO],
        sender: FROM,
        subject: "Website form submission",
        text_body: JSON.stringify(payload)
      })
    });

    const out = await r.json().catch(() => ({}));
    const data = (out && out.data) ? out.data : {};
    const sent = Number(data.succeeded || 0);
    const failed = Number(data.failed || 0);

    if (!r.ok || sent < 1 || failed > 0) {
      let detail = data.failures || data.error || out.error || out.error_code || ("HTTP " + r.status);
      if (typeof detail !== "string") detail = JSON.stringify(detail);
      res.status(502).json({ ok: false, error: "Email send failed", detail: detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: "Email send failed", detail: String(e && e.message ? e.message : e) });
  }
};
