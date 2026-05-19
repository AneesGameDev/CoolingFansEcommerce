// Email sending via Resend. No-op when RESEND_API_KEY is empty.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@ohomart.online";

let _resend = null;
function getResend() {
  if (!RESEND_API_KEY) return null;
  if (!_resend) {
    // Lazy require so the build doesn't bundle Resend when unused.
    const { Resend } = require("resend");
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
}

async function sendEmail({ to, subject, html }) {
  const client = getResend();
  if (!client) {
    console.warn("RESEND_API_KEY missing — email skipped");
    return null;
  }
  try {
    const result = await client.emails.send({
      from: SENDER_EMAIL,
      to: [to],
      subject,
      html,
    });
    return result;
  } catch (err) {
    console.error("Resend send failed:", err && err.message);
    return null;
  }
}

module.exports = { sendEmail };
