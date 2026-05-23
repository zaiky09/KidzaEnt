// Email transport — uses Brevo's transactional email HTTPS API.
//
// Why Brevo: lets us verify a single Gmail sender (kidzaltd@gmail.com)
// and then send to ANY recipient on the free tier (300/day). Resend
// requires a verified domain before sending to non-account-holders, and
// Gmail SMTP was unreliable from Render's free dyno.
//
// Public interface:
//
//   sendMail({
//     to:           'user@example.com',          // string or string[]
//     subject:      'Subject line',
//     html:         '<p>HTML body</p>',
//     attachments?: [{ filename, content: Buffer }]
//   })
//
// Throws on failure (existing callers expect that).

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const FROM_NAME = 'Kidza Marketplace';
const FROM_EMAIL = process.env.BREVO_FROM || process.env.EMAIL_USER || 'kidzaltd@gmail.com';
const REPLY_TO_EMAIL = process.env.EMAIL_USER || 'kidzaltd@gmail.com';

// Sandbox redirect (optional): if set, every outgoing email is funneled
// to this address with the intended recipient preserved in the subject.
// Useful while testing; leave unset in normal operation.
const SANDBOX_REDIRECT = process.env.EMAIL_SANDBOX_REDIRECT || null;

function getApiKey() {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error('BREVO_API_KEY is not set on the server');
  }
  return key;
}

/**
 * Send a transactional email via Brevo.
 * @returns {Promise<{ messageId: string }>}
 */
async function sendMail({ to, subject, html, attachments }) {
  if (!to || !subject || !html) {
    throw new Error('sendMail requires { to, subject, html }');
  }

  let finalTo = Array.isArray(to) ? to : [to];
  let finalSubject = subject;
  if (SANDBOX_REDIRECT) {
    finalSubject = `[For: ${finalTo.join(', ')}] ${subject}`;
    finalTo = [SANDBOX_REDIRECT];
  }

  const payload = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: finalTo.map((email) => ({ email })),
    replyTo: { email: REPLY_TO_EMAIL },
    subject: finalSubject,
    htmlContent: html
  };

  // Brevo wants attachments as base64-encoded strings under "attachment".
  if (Array.isArray(attachments) && attachments.length) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content
    }));
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': getApiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let detail = body;
    try { detail = JSON.parse(body); } catch { /* keep as text */ }
    const err = new Error(`Brevo send failed: ${res.status} ${typeof detail === 'string' ? detail.slice(0, 200) : (detail.message || detail.code || res.statusText)}`);
    err.brevo = detail;
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  console.log('[mail] sent', data.messageId, '→', to, '·', subject);
  return data;
}

// One-time check on boot — just confirms the API key is present.
// We don't pre-flight against Brevo's API to avoid wasting a quota call.
function verifyConfig() {
  try {
    getApiKey();
    if (SANDBOX_REDIRECT) {
      console.log(`✅ Email Service Ready (Brevo) — SANDBOX: all mail → ${SANDBOX_REDIRECT}`);
    } else {
      console.log(`✅ Email Service Ready (Brevo) — from ${FROM_EMAIL}`);
    }
  } catch (err) {
    console.error('❌ Email Service Error:', err.message);
  }
}

module.exports = { sendMail, verifyConfig };
