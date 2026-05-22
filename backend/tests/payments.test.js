// Mock daraja BEFORE app.js (which mounts the payments route) is required.
// Otherwise the real daraja module — which would try to hit Safaricom — would
// be wired into the route by the time we get to override it.
jest.mock('../utils/daraja', () => {
  const actual = jest.requireActual('../utils/daraja');
  return {
    ...actual,
    initiateStkPush: jest.fn() // overridden per-test
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const CatalogItem = require('../models/CatalogItem');
const Order = require('../models/Order');
const daraja = require('../utils/daraja');
const { startMemoryMongo, stopMemoryMongo, clearCollections } = require('./helpers/mongo');

const issueToken = (userId, role = 'customer') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(startMemoryMongo);
afterAll(stopMemoryMongo);
afterEach(async () => {
  await clearCollections();
  daraja.initiateStkPush.mockReset();
});

async function seedOrder() {
  const customer = await User.create({
    username: 'Cust', email: 'c@example.com', phone: '0712345678', password: 'hashed'
  });
  const item = await CatalogItem.create({
    name: 'Bread', type: 'product', category: 'Pantry Staples', price: 100, weightPerItemKg: 0.5
  });
  const order = await Order.create({
    customerId: customer._id,
    items: [{ item: item._id, quantity: 2 }],
    expectedDeliveryDate: new Date(Date.now() + 86400000),
    deliveryAddress: '123 Main',
    customerPhone: '0712345678',
    dropoffLat: -1.28, dropoffLng: 36.81,
    itemSubtotal: 200, deliveryFee: 0,
    totalPrice: 200, totalWeightKg: 1
  });
  return { customer, order };
}

describe('POST /api/payments/stk-push', () => {
  test('requires authentication', async () => {
    const res = await request(app).post('/api/payments/stk-push').send({ orderId: 'x' });
    expect(res.status).toBe(401);
  });

  test('initiates STK push and persists CheckoutRequestID', async () => {
    const { customer, order } = await seedOrder();
    daraja.initiateStkPush.mockResolvedValue({
      checkoutRequestId: 'ws_CO_123',
      merchantRequestId: 'mr_456',
      customerMessage: 'Success. Request accepted for processing'
    });

    const res = await request(app)
      .post('/api/payments/stk-push')
      .set('Authorization', `Bearer ${issueToken(customer._id)}`)
      .send({ orderId: order._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.checkoutRequestId).toBe('ws_CO_123');
    expect(daraja.initiateStkPush).toHaveBeenCalledWith(expect.objectContaining({
      phone: '0712345678',
      amount: 200
    }));

    const reloaded = await Order.findById(order._id);
    expect(reloaded.mpesaCheckoutRequestId).toBe('ws_CO_123');
    expect(reloaded.paymentStatus).toBe('pending');
  });

  test('rejects when caller does not own the order', async () => {
    const { order } = await seedOrder();
    const stranger = await User.create({
      username: 'Stranger', email: 's@example.com', phone: '0700000000', password: 'hashed'
    });
    const res = await request(app)
      .post('/api/payments/stk-push')
      .set('Authorization', `Bearer ${issueToken(stranger._id)}`)
      .send({ orderId: order._id.toString() });
    expect(res.status).toBe(403);
  });

  test('returns 409 if the order is already paid', async () => {
    const { customer, order } = await seedOrder();
    order.paymentStatus = 'completed';
    await order.save();

    const res = await request(app)
      .post('/api/payments/stk-push')
      .set('Authorization', `Bearer ${issueToken(customer._id)}`)
      .send({ orderId: order._id.toString() });
    expect(res.status).toBe(409);
    expect(daraja.initiateStkPush).not.toHaveBeenCalled();
  });

  test('returns 502 when daraja itself errors out', async () => {
    const { customer, order } = await seedOrder();
    daraja.initiateStkPush.mockRejectedValue(new Error('Safaricom is down'));

    const res = await request(app)
      .post('/api/payments/stk-push')
      .set('Authorization', `Bearer ${issueToken(customer._id)}`)
      .send({ orderId: order._id.toString() });
    expect(res.status).toBe(502);
  });
});

describe('POST /api/payments/callback', () => {
  const successCallback = (checkoutRequestId) => ({
    Body: {
      stkCallback: {
        MerchantRequestID: 'mr_456',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 200 },
            { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
            { Name: 'TransactionDate', Value: 20260522183000 },
            { Name: 'PhoneNumber', Value: 254712345678 }
          ]
        }
      }
    }
  });

  const failureCallback = (checkoutRequestId) => ({
    Body: {
      stkCallback: {
        MerchantRequestID: 'mr_456',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 1032,
        ResultDesc: 'Request cancelled by user'
      }
    }
  });

  test('marks the order paid on a successful callback', async () => {
    const { order } = await seedOrder();
    order.mpesaCheckoutRequestId = 'ws_CO_123';
    await order.save();

    const res = await request(app).post('/api/payments/callback').send(successCallback('ws_CO_123'));
    expect(res.status).toBe(200);

    const reloaded = await Order.findById(order._id);
    expect(reloaded.paymentStatus).toBe('completed');
    expect(reloaded.mpesaReceiptNumber).toBe('NLJ7RT61SV');
  });

  test('marks the order failed on a failure callback', async () => {
    const { order } = await seedOrder();
    order.mpesaCheckoutRequestId = 'ws_CO_456';
    await order.save();

    await request(app).post('/api/payments/callback').send(failureCallback('ws_CO_456'));
    const reloaded = await Order.findById(order._id);
    expect(reloaded.paymentStatus).toBe('failed');
    expect(reloaded.mpesaResultDesc).toMatch(/cancelled/i);
  });

  test('is idempotent — second callback for the same paid order is a no-op', async () => {
    const { order } = await seedOrder();
    order.mpesaCheckoutRequestId = 'ws_CO_789';
    order.paymentStatus = 'completed';
    order.mpesaReceiptNumber = 'ORIGINAL';
    await order.save();

    await request(app).post('/api/payments/callback').send(successCallback('ws_CO_789'));
    const reloaded = await Order.findById(order._id);
    expect(reloaded.mpesaReceiptNumber).toBe('ORIGINAL'); // not overwritten
  });

  test('always returns 200 even for unknown CheckoutRequestID (Safaricom expects ack)', async () => {
    const res = await request(app).post('/api/payments/callback').send(successCallback('ws_CO_unknown'));
    expect(res.status).toBe(200);
  });

  test('returns 200 even on totally malformed body (no retries)', async () => {
    const res = await request(app).post('/api/payments/callback').send({ wrong: 'shape' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/payments/status/:checkoutRequestId', () => {
  test('returns the latest paymentStatus for the order owner', async () => {
    const { customer, order } = await seedOrder();
    order.mpesaCheckoutRequestId = 'ws_CO_xyz';
    order.paymentStatus = 'completed';
    order.mpesaReceiptNumber = 'NLJ7';
    await order.save();

    const res = await request(app)
      .get('/api/payments/status/ws_CO_xyz')
      .set('Authorization', `Bearer ${issueToken(customer._id)}`);
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('completed');
    expect(res.body.receiptNumber).toBe('NLJ7');
  });

  test('rejects when the caller is not the order owner', async () => {
    const { order } = await seedOrder();
    order.mpesaCheckoutRequestId = 'ws_CO_xyz';
    await order.save();
    const stranger = await User.create({
      username: 'Other', email: 'o@example.com', phone: '0700000001', password: 'hashed'
    });

    const res = await request(app)
      .get('/api/payments/status/ws_CO_xyz')
      .set('Authorization', `Bearer ${issueToken(stranger._id)}`);
    expect(res.status).toBe(403);
  });
});

describe('daraja util — pure helpers', () => {
  test('normalisePhone handles 254, +254, 0, and 9-digit forms', () => {
    expect(daraja.normalisePhone('254712345678')).toBe('254712345678');
    expect(daraja.normalisePhone('+254712345678')).toBe('254712345678');
    expect(daraja.normalisePhone('0712345678')).toBe('254712345678');
    expect(daraja.normalisePhone('712345678')).toBe('254712345678');
    expect(daraja.normalisePhone('garbage')).toBeNull();
    expect(daraja.normalisePhone(null)).toBeNull();
  });

  test('parseCallback returns null for unrecognised shape', () => {
    expect(daraja.parseCallback({})).toBeNull();
    expect(daraja.parseCallback(null)).toBeNull();
  });

  test('parseCallback flattens the Item array into named fields', () => {
    const parsed = daraja.parseCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm', CheckoutRequestID: 'c',
          ResultCode: 0, ResultDesc: 'ok',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'XYZ' }
            ]
          }
        }
      }
    });
    expect(parsed.success).toBe(true);
    expect(parsed.amount).toBe(100);
    expect(parsed.receiptNumber).toBe('XYZ');
  });
});
