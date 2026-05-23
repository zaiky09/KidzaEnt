// Email transport. Uses Resend's HTTPS API.
//
// Free-tier Resend can only send to the account holder's verified address
// (kidzaltd@gmail.com) until a custom domain is verified. Until then we
// run with EMAIL_SANDBOX_REDIRECT set, which funnels every outgoing
// email to that single inbox while preserving the intended recipient in
// the subject line. Once you verify a domain in Resend:
//   1. Set RESEND_FROM to your branded address (e.g. hello@kidza.co.ke)
//   2. Unset EMAIL_SANDBOX_REDIRECT
// Emails will then route to real recipients normally.
//
// Public interface — unchanged across providers:
//   sendMail({
//     to:           'user@example.com',          // string or string[]
//     subject:      'Subject line',
//     html:         '<p>HTML body</p>',
//     attachments?: [{ filename, content: Buffer }]
//   })

const { Resend } = require('resend');

const DEFAULT_FROM_NAME = 'Kidza Marketplace';
const DEFAULT_FROM_ADDRESS = process.env.RESEND_FROM || 'onboarding@resend.dev';
const REPLY_TO = process.env.EMAIL_USER || 'kidzaltd@gmail.com';

// Sandbox redirect: when set, every email re-targets to this inbox and the
// intended recipient is preserved in the subject ("[For: orig@x.com] ...").
const SANDBOX_REDIRECT = process.env.EMAIL_SANDBOX_REDIRECT || null;

let client = null;
function getClient() {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set on the server');
  }
  client = new Resend(key);
  return client;
}

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
    from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_ADDRESS}>`,
    to: finalTo,
    reply_to: REPLY_TO,
    subject: finalSubject,
    html
  };

  if (Array.isArray(attachments) && attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content
    }));
  }

  const { data, error } = await getClient().emails.send(payload);
  if (error) {
    const err = new Error(`Resend send failed: ${error.message || JSON.stringify(error)}`);
    err.resend = error;
    throw err;
  }
  console.log('[mail] sent', data?.id, '→', to, '·', subject);
  return data;
}

function verifyConfig() {
  try {
    getClient();
    if (SANDBOX_REDIRECT) {
      console.log(`✅ Email Service Ready (Resend) — SANDBOX: all mail → ${SANDBOX_REDIRECT}`);
    } else {
      console.log('✅ Email Service Ready (Resend)');
    }
  } catch (err) {
    console.error('❌ Email Service Error:', err.message);
  }
}

module.exports = { sendMail, verifyConfig };
