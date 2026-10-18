const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const server = await MongoMemoryServer.create({ instance: { port: 27017, ip: '127.0.0.1' } });
  console.log('MONGO_READY ' + server.getUri());
  const stop = async () => { await server.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error('MONGO_FAIL', e); process.exit(1); });