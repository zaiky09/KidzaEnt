// One nodemailer transporter shared across all outbound email (password
// reset, receipt, delivery confirmation, driver approval). Built once at
// module load so we don't open a new connection per message.
//
// Important config choices for hosted environments (Render free tier):
//   - port 587 + STARTTLS (more reliably open than port 465 / SMTPS)
//   - explicit short timeouts so a stuck connection returns a 500 in
//     ~10s rather than blocking the request for the OS default (~75s)
//   - pool: true keeps the TCP connection open across messages, which
//     dramatically cuts cold-send latency once the first message lands

const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,        // STARTTLS on port 587
    requireTLS: true,
    // Force IPv4. Render's free tier has no outbound IPv6, and
    // dns.setDefaultResultOrder('ipv4first') doesn't always reach
    // nodemailer's internal DNS lookup — explicit family is bulletproof.
    family: 4,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    // Fail fast — defaults can hang the request for over a minute.
    connectionTimeout: 10_000, // ms
    greetingTimeout: 10_000,
    socketTimeout: 30_000
  });

  // One-time credential check on boot, mirroring the old behaviour but
  // here in one place. Failures are non-fatal — the server still starts;
  // sends will surface their own errors per request.
  transporter.verify((err) => {
    if (err) console.error(`❌ Email Service Error: ${err.message}`);
    else console.log(`✅ Email Service Ready (smtp.gmail.com:587)`);
  });

  return transporter;
}

module.exports = { getTransporter };
