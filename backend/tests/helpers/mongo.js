// Spin up a single in-memory MongoDB for the whole test run, then clear
// collections between tests so each test starts from a known state.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function startMemoryMongo() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 });
}

async function stopMemoryMongo() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { startMemoryMongo, stopMemoryMongo, clearCollections };
