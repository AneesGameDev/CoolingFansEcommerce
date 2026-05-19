// Cached MongoDB client for Vercel serverless functions.
// The connection is created once per warm container and reused across invocations.
const { MongoClient } = require("mongodb");
const { seedDatabase } = require("./seed");

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "OhoMartDB";

if (!MONGO_URL) {
  // Throw early so the function logs a clear error rather than hanging.
  console.error("MONGO_URL env var is required");
}

// In serverless, modules are kept warm across invocations of the same container.
// We cache the client + a one-time seed promise on `global` so HMR/dev reloads also reuse it.
let cached = global.__OHOMART_MONGO__;

if (!cached) {
  cached = global.__OHOMART_MONGO__ = {
    client: null,
    clientPromise: null,
    seeded: false,
    seedPromise: null,
  };
}

async function getClient() {
  if (cached.client) return cached.client;
  if (!cached.clientPromise) {
    cached.clientPromise = MongoClient.connect(MONGO_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
  }
  cached.client = await cached.clientPromise;
  return cached.client;
}

async function getDb() {
  const client = await getClient();
  const db = client.db(DB_NAME);

  // First-connect: run idempotent seeding (indexes, admins, products, settings).
  if (!cached.seeded) {
    if (!cached.seedPromise) {
      cached.seedPromise = seedDatabase(db)
        .then(() => { cached.seeded = true; })
        .catch((err) => {
          console.error("Seed error:", err);
          // Do not block requests forever if seed fails; allow retry on next cold start.
          cached.seedPromise = null;
        });
    }
    await cached.seedPromise;
  }

  return db;
}

module.exports = { getClient, getDb, DB_NAME };
