const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CatalogItem = require('../models/CatalogItem');
const Order = require('../models/Order');
const { startMemoryMongo, stopMemoryMongo, clearCollections } = require('./helpers/mongo');

const issueToken = (userId, role) => jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(startMemoryMongo);
afterAll(stopMemoryMongo);
afterEach(clearCollections);

async function seedScenario() {
  const customer = await User.create({
    username: 'Cust', email: 'cust@example.com', phone: '0712345678', password: 'hashed'
  });
  const driver = await User.create({
    username: 'Drv', email: 'drv@example.com', phone: '0712345679', password: 'hashed',
    role: 'driver', isApproved: true, isProfileComplete: true
  });
  const otherDriver = await User.create({
    username: 'OtherDrv', email: 'odrv@example.com', phone: '0712345670', password: 'hashed',
    role: 'driver', isApproved: true, isProfileComplete: true
  });
  const admin = await User.create({
    username: 'Adm', email: 'a@example.com', phone: '0712345677', password: 'hashed', role: 'admin'
  });

  const item = await CatalogItem.create({
    name: 'Tomatoes', type: 'product', category: 'Fresh Produce', price: 50, weightPerItemKg: 1
  });

  const order = await Order.create({
    customerId: customer._id,
    items: [{ item: item._id, quantity: 2 }],
    status: 'pending',
    expectedDeliveryDate: new Date(Date.now() + 86400000),
    deliveryAddress: '123 Main St',
    customerPhone: '0712345678',
    dropoffLat: -1.286,
    dropoffLng: 36.817,
    totalPrice: 100,
    totalWeightKg: 2
  });

  return { customer, driver, otherDriver, admin, order, item };
}

describe('POST /api/orders', () => {
  test('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
  });

  test('persists dropoff coordinates (the Order schema bug fix)', async () => {
    const { customer, item } = await seedScenario();
    const token = issueToken(customer._id, 'customer');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ item: item._id, quantity: 3 }],
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        deliveryAddress: '456 Other St',
        customerPhone: '0798765432',
        dropoffLat: -1.5,
        dropoffLng: 36.5
      });

    expect(res.status).toBe(201);
    // These three fields used to be silently dropped by Mongoose strict mode.
    expect(res.body.dropoffLat).toBe(-1.5);
    expect(res.body.dropoffLng).toBe(36.5);
    expect(res.body.customerPhone).toBe('0798765432');
  });
});

describe('PUT /api/orders/:id/status authorization', () => {
  test('unassigned driver cannot accept then a second driver cannot steal it', async () => {
    const { driver, otherDriver, order } = await seedScenario();

    // driver accepts
    let res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${issueToken(driver._id, 'driver')}`)
      .send({ status: 'accepted_by_driver' });
    expect(res.status).toBe(200);
    expect(res.body.driverId.toString()).toBe(driver._id.toString());

    // otherDriver tries to accept the same order — should be 409
    res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${issueToken(otherDriver._id, 'driver')}`)
      .send({ status: 'accepted_by_driver' });
    expect(res.status).toBe(409);
  });

  test('driver assigned to the order can mark it in_transit, then delivered', async () => {
    const { driver, order } = await seedScenario();
    order.driverId = driver._id;
    order.status = 'accepted_by_driver';
    await order.save();

    const token = issueToken(driver._id, 'driver');

    let res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_transit' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_transit');

    res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });

  test('customers cannot flip status via this route', async () => {
    const { customer, order } = await seedScenario();
    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${issueToken(customer._id, 'customer')}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(403);
  });

  test('a driver not assigned to the order cannot advance it past accepted', async () => {
    const { driver, otherDriver, order } = await seedScenario();
    order.driverId = driver._id;
    order.status = 'accepted_by_driver';
    await order.save();

    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${issueToken(otherDriver._id, 'driver')}`)
      .send({ status: 'in_transit' });
    expect(res.status).toBe(403);
  });

  test('admin can cancel a pending order', async () => {
    const { admin, order } = await seedScenario();
    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${issueToken(admin._id, 'admin')}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  test('returns 404 for non-existent order', async () => {
    const { admin } = await seedScenario();
    const res = await request(app)
      .put(`/api/orders/${new mongoose.Types.ObjectId()}/status`)
      .set('Authorization', `Bearer ${issueToken(admin._id, 'admin')}`)
      .send({ status: 'in_transit' });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/orders/:id/cancel', () => {
  test('customer can cancel their own pending order', async () => {
    const { customer, order } = await seedScenario();
    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${issueToken(customer._id, 'customer')}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  test('other customer cannot cancel someone else\'s order', async () => {
    const { order } = await seedScenario();
    const stranger = await User.create({
      username: 'Stranger', email: 's@example.com', phone: '0712345671', password: 'hashed'
    });
    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${issueToken(stranger._id, 'customer')}`);
    expect(res.status).toBe(403);
  });
});
