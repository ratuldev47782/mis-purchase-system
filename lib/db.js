import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'MIS_Parchase_DB';
const SEED_CATEGORIES = ['Printer/Printer Servicing Accessories/Gear', 'Mother board Service Bill',
  'Monthly Internet bill', 'Installation charge of Internet', 'IT Accessories', 'UPS Battery'];

const g = global;
if (!g._misDb) g._misDb = { promise: null };

async function init(db) {
  await db.collection('bills').createIndex({ billNo: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('ledgerEntries').createIndex({ billNo: 1 });
  await db.collection('ledgerEntries').createIndex({ fiscalYear: 1 });
  if ((await db.collection('users').countDocuments()) === 0)
    await db.collection('users').insertOne({ username: 'admin', password: 'admin123', name: 'Admin' });
  await db.collection('settings').updateOne({ _id: 'main' },
    { $setOnInsert: { startingBillNo: 1, ledgerAmountMode: 'subtotal' } }, { upsert: true });
  if ((await db.collection('categories').countDocuments()) === 0)
    await db.collection('categories').insertMany(SEED_CATEGORIES.map((name, i) => ({ name, sortOrder: i + 1 })));
}

export async function getDb() {
  if (!g._misDb.promise) {
    g._misDb.promise = (async () => {
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db(dbName);
      await init(db);
      return db;
    })();
    g._misDb.promise.catch(() => { g._misDb.promise = null; });
  }
  return g._misDb.promise;
}

export const getSettings = (db) => db.collection('settings').findOne({ _id: 'main' });
