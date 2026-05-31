// tests/setup.ts
import 'dotenv/config';
import mongoose from 'mongoose';

// Global mock for Redis to prevent tests from needing a running Redis server
jest.mock('../src/config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(30000);

// Connect to MongoDB test database before all tests
beforeAll(async () => {
  const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker';
  // Use a separate test database to avoid messing with development data
  const testUri = baseUri.includes('/tasktracker')
    ? baseUri.replace('/tasktracker', '/tasktracker_test')
    : `${baseUri}_test`;

  await mongoose.connect(testUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
});

// Clean up database and close connection after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
  await mongoose.disconnect();
});
