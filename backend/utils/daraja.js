// Thin client for Safaricom's Daraja API: OAuth + STK Push.
// Designed so tests can mock the underlying fetch by passing in a fetch impl.

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

const env = (key, fallback) => process.env[key] ?? fallback;

const config = () => ({
  baseUrl: env('MPESA_ENV', 'sandbox') === 'production' ? PRODUCTION_BASE : SANDBOX_BASE,
  consumerKey: env('MPESA_CONSUMER_KEY'),
  consumerSecret: env('MPESA_CONSUMER_SECRET'),
  shortcode: env('MPESA_SHORTCODE'),
  passkey: env('MPESA_PASSKEY'),
  callbackUrl: env('MPESA_CALLBACK_URL')
});

// Cache the OAuth token in-memory; Daraja tokens live ~3600s.
const tokenCache = { value: null, expiresAt: 0 };

async function getAccessToken({ fetchImpl = fetch } = {}) {
  const cfg = config();
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }

  if (!cfg.consumerKey || !cfg.consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET not set');
  }

  const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  const res = await fetchImpl(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) {
    throw new Error(`Daraja OAuth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  tokenCache.value = data.access_token;
  tokenCache.expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return data.access_token;
}

// Reset the cache — useful in tests between cases.
function _resetTokenCache() {
  tokenCache.value = null;
  tokenCache.expiresAt = 0;
}

// Safaricom expects the timestamp in YYYYMMDDhhmmss format (no separators).
function timestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

// Normalise Kenyan phone to 254… format (Daraja's requirement).
function normalisePhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.length === 9) return '254' + digits;
  return null;
}

async function initiateStkPush({ phone, amount, reference, description, fetchImpl = fetch }) {
  const cfg = config();
  if (!cfg.shortcode || !cfg.passkey) throw new Error('MPESA_SHORTCODE / MPESA_PASSKEY not set');
  if (!cfg.callbackUrl) throw new Error('MPESA_CALLBACK_URL not set');

  const phoneNumber = normalisePhone(phone);
  if (!phoneNumber) throw new Error(`Invalid phone number: ${phone}`);

  const ts = timestamp();
  const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${ts}`).toString('base64');
  const token = await getAccessToken({ fetchImpl });

  const payload = {
    BusinessShortCode: cfg.shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    // Daraja requires an integer amount; round up to avoid undercharging.
    Amount: Math.ceil(Number(amount)),
    PartyA: phoneNumber,
    PartyB: cfg.shortcode,
    PhoneNumber: phoneNumber,
    CallBackURL: cfg.callbackUrl,
    AccountReference: (reference || 'Kidza').slice(0, 12),
    TransactionDesc: (description || 'Kidza order').slice(0, 13)
  };

  const res = await fetchImpl(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errorCode || data.ResponseCode !== '0') {
    const msg = data.errorMessage || data.ResponseDescription || `HTTP ${res.status}`;
    const err = new Error(`STK push failed: ${msg}`);
    err.daraja = data;
    throw err;
  }
  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    customerMessage: data.CustomerMessage
  };
}

// Parse Safaricom's callback body. Always returns a normalised object so the
// route handler doesn't have to know about Daraja's nested array-of-pairs shape.
function parseCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb) return null;
  const items = cb.CallbackMetadata?.Item || [];
  const meta = {};
  for (const { Name, Value } of items) meta[Name] = Value;
  return {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    success: cb.ResultCode === 0,
    receiptNumber: meta.MpesaReceiptNumber,
    amount: meta.Amount,
    phone: meta.PhoneNumber,
    transactionDate: meta.TransactionDate
  };
}

module.exports = {
  getAccessToken,
  initiateStkPush,
  parseCallback,
  normalisePhone,
  timestamp,
  _resetTokenCache,
  _config: config
};
