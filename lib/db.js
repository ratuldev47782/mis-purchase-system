// lib/db.js

import mongoose from 'mongoose';
import { User, Settings, Category, Bill, LedgerEntry } from '../models';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'MIS_Parchase_DB';

const SEED_CATEGORIES = ['Printer/Printer Servicing Accessories/Gear', 'Mother board Service Bill',
  'Monthly Internet bill', 'Installation charge of Internet', 'IT Accessories', 'UPS Battery'];

const g = global;
if (!g._misDb) g._misDb = { promise: null };

async function init() {
  // Same indexes as before: unique Bill No, unique username, ledger lookups.
  await Promise.all([Bill.createIndexes(), User.createIndexes(), LedgerEntry.createIndexes()]);
  if ((await User.countDocuments()) === 0)
    await User.create({ username: 'admin', password: 'admin123', name: 'Admin' });
  await Settings.updateOne({ _id: 'main' },
    { $setOnInsert: { startingBillNo: 1, ledgerAmountMode: 'subtotal' } }, { upsert: true });
  if ((await Category.countDocuments()) === 0)
    await Category.insertMany(SEED_CATEGORIES.map((name, i) => ({ name, sortOrder: i + 1 })));
}

// Cached on globalThis so Next.js dev fast-refresh reuses one connection.
export async function connectDB() {
  if (!g._misDb.promise) {
    g._misDb.promise = (async () => {
      const conn = await mongoose.connect(uri, { dbName });
      await init();
      return conn;
    })();
    g._misDb.promise.catch(() => { g._misDb.promise = null; });
  }
  return g._misDb.promise;
}

export const getSettings = () => Settings.findOne({ _id: 'main' }).lean();