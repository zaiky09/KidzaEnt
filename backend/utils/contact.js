// Brand-wide contact constants used by email templates and any other
// backend code that needs the support phone. Mirrored in the frontend at
// marketplace-frontend/src/constants.js — keep both in sync.

const SUPPORT_PHONE = '+254702687992';
const SUPPORT_PHONE_DISPLAY = '+254 702 687 992';
const SUPPORT_EMAIL = process.env.EMAIL_USER || 'kidzaltd@gmail.com';

// Reusable HTML footer for transactional emails so every notification ends
// with a clear way to reach a human.
function supportFooterHtml() {
  return `
    <hr style="margin: 24px 0 12px 0; border: none; border-top: 1px solid #E5E7EB;" />
    <p style="color:#6B7280;font-size:12px;line-height:1.5;margin:0;">
      Need help with this order? Reply to this email or call our helpline at
      <a href="tel:${SUPPORT_PHONE}" style="color:#111827;font-weight:600;">${SUPPORT_PHONE_DISPLAY}</a>
      (7am–10pm EAT, daily). We typically respond within an hour.
    </p>
  `;
}

module.exports = { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL, supportFooterHtml };
