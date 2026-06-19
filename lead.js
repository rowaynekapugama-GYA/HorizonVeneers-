// api/lead.js — Horizon Dental lead relay (Vercel serverless function)
// ---------------------------------------------------------------------------
// Receives the booking-form POST from index.html and emails it to your SmileOx
// CRM intake address via the SMTP2GO HTTP API. (A browser cannot send SMTP
// email directly, so this small same-origin relay does it server-side.)
//
// SET THESE as Environment Variables in Vercel, then redeploy:
//   Project → Settings → Environment Variables
//
//   SMTP2GO_API_KEY   (required)  Your SMTP2GO API key, e.g. api-XXXXXXXXXXXX
//   INTAKE_ADDRESS    (required)  Where leads are emailed — your SmileOx intake address
//   SMTP_FROM         (optional)  From header. Default: Horizon Dental <no-reply@horizondental.com.au>
//   ALLOW_ORIGIN      (optional)  CORS origin. Default: "*" (same-origin needs nothing)
//
// Quick test once deployed:  GET https://YOURSITE/api/lead  →  {"ok":false,"error":"Method not allowed"}
// (That JSON means the function is live. A 404 means it isn't deployed in an /api folder.)
// ---------------------------------------------------------------------------

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
  const API_KEY = process.env.SMTP2GO_API_KEY;
  const TO = process.env.INTAKE_ADDRESS;
  const FROM = process.env.SMTP_FROM || "Horizon Dental <no-reply@horizondental.com.au>";
  const missing = [];
  if (!API_KEY) missing.push("SMTP2GO_API_KEY");
  if (!TO) missing.push("INTAKE_ADDRESS");
  if (missing.length) { res.status(500).json({ ok: false, error: "Server not configured", missing: missing }); return; }

  // ---- assemble the lead ----
  const v = (k) => (body[k] == null ? "" : String(body[k]).trim());
  const firstName = v("firstName"), lastName = v("lastName");
  const fullName = (firstName + " " + lastName).trim() || "(no name given)";
  const email = v("email");

  const textBody = [
    "New veneer enquiry from the Horizon Dental landing page",
    "------------------------------------------------------",
    "Name:         " + fullName,
    "Email:        " + email,
    "Phone:        " + v("phoneNumber"),
    "Smile goals:  " + (v("smileGoals") || "—"),
    "Suitability:  " + (v("suitability") || "—"),
    "",
    "Submitted:    " + new Date().toISOString()
  ].join("\n");

  const htmlBody =
    "<h2 style=\"font-family:Arial,sans-serif\">New veneer enquiry</h2>" +
    "<table style=\"font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse\">" +
    row("Name", fullName) + row("Email", email) + row("Phone", v("phoneNumber")) +
    row("Smile goals", v("smileGoals") || "—") + row("Suitability", v("suitability") || "—") +
    "</table>" +
    "<p style=\"color:#888;font-family:Arial,sans-serif;font-size:12px\">Submitted " + new Date().toISOString() + "</p>";

  // ---- send via SMTP2GO HTTP API ----
  try {
    const r = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Smtp2go-Api-Key": API_KEY },
      body: JSON.stringify({
        api_key: API_KEY,
        to: [TO],
        sender: FROM,
        subject: "New veneer enquiry — " + fullName,
        text_body: textBody,
        html_body: htmlBody,
        custom_headers: email ? [{ header: "Reply-To", value: email }] : []
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

function row(label, value) {
  return "<tr><td style=\"padding:4px 14px 4px 0;color:#555;font-weight:bold;vertical-align:top\">" +
    esc(label) + "</td><td style=\"padding:4px 0\">" + esc(value) + "</td></tr>";
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
