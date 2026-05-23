// Email transport. Uses Resend's HTTPS API instead of SMTP — Gmail SMTP on
// Render's free tier was consistently hitting IPv6 ETIMEDOUTs even after
// forcing IPv4 at multiple layers. HTTP works anywhere.
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
// Throws on failure (the previous nodemailer wrapper also threw), so the
// existing receipt / delivery / forgot-password call sites work unchanged.

const { Resend } = require('resend');

// Display name + reply-to use the real Kidza brand so customers see "Kidza
// Marketplace" in their inbox. The actual envelope-from on the free tier
// has to be onboarding@resend.dev (Resend's default verified sender) until
// we verify a custom domain like mail.kidza.co.ke.
const DEFAULT_FROM_NAME = 'Kidza Marketplace';
const DEFAULT_FROM_ADDRESS = process.env.RESEND_FROM || 'onboarding@resend.dev';
const REPLY_TO = process.env.EMAIL_USER || 'kidzaltd@gmail.com';

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

/**
 * Send a transactional email via Resend.
 * @returns {Promise<{ id: string }>} Resend's response (id of the queued email)
 */
async function sendMail({ to, subject, html, attachments }) {
  if (!to || !subject || !html) {
    throw new Error('sendMail requires { to, subject, html }');
  }

  const payload = {
    from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_ADDRESS}>`,
    to: Array.isArray(to) ? to : [to],
    reply_to: REPLY_TO,
    subject,
    html
  };

  // Resend accepts attachments as { filename, content } where content is
  // a base64 string or Buffer. We have callers passing Buffers already so
  // this is a 1:1 pass-through.
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

// Optional smoke-test on boot so we know if RESEND_API_KEY is missing.
// Doesn't actually send mail — just tries to construct the client.
function verifyConfig() {
  try {
    getClient();
    console.log('✅ Email Service Ready (Resend)');
  } catch (err) {
    console.error('❌ Email Service Error:', err.message);
  }
}

module.exports = { sendMail, verifyConfig };
