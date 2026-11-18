const path = require('path');
const express = require('express');
// Load Backend/.env explicitly so startup works regardless of process cwd.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { assertProductionJwtSecret } = require('./utils/jwtSecret');

try {
  assertProductionJwtSecret();
} catch (err) {
  console.error('[auth] JWT configuration rejected:', err.message);
  process.exit(1);
}

const cors = require('cors');
const route = require('./routes/route');
const errorHandler = require('./middleware/errorHandler');
const { buildCorsOptions } = require('./config/corsOptions');
const { assertMoyasarCredentials } = require('./services/paymentProviders/moyasarConfig');
const { connectAndPrepareDatabase } = require('./dbConnect/dbConnect');

try {
  assertMoyasarCredentials();
} catch (err) {
  console.error('[payments] Moyasar configuration rejected:', err.message);
  process.exit(1);
}

const NextifyServer = express();
console.log('🔥 INDEX.JS IS RUNNING FROM:', __dirname);
const port = process.env.PORT || 5000;

const corsOptions = buildCorsOptions();

NextifyServer.use(cors(corsOptions));
NextifyServer.options('/{*splat}', cors(corsOptions));
NextifyServer.use(express.json({ limit: '200mb' }));
NextifyServer.use(express.urlencoded({ limit: '200mb', extended: true }));
NextifyServer.use(route);
NextifyServer.use(errorHandler);

NextifyServer.get('/', (req, res) => {
  res.status(200).send(`<h1>NextifyServer running at PORT=${port} and waiting for client request</h1>`);
});

/**
 * Connect DB, confirm payment indexes, then accept HTTP traffic.
 * Exported for tests that assert listen happens only after readiness.
 */
async function bootstrap({ listen = true, listenImpl } = {}) {
  await connectAndPrepareDatabase();

  if (!listen) {
    return { app: NextifyServer, server: null };
  }

  const startListen = typeof listenImpl === 'function'
    ? listenImpl
    : (app, p, cb) => app.listen(p, cb);

  const server = await new Promise((resolve, reject) => {
    const s = startListen(NextifyServer, port, () => {
      console.log(`NextifyServer running at PORT=${port} and waiting for client request`);
      resolve(s);
    });
    if (s && typeof s.on === 'function') {
      s.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Set PORT in Backend/.env to a free port.`);
        } else {
          console.error(err);
        }
        reject(err);
      });
    }
  });

  return { app: NextifyServer, server };
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[startup] Refusing to listen — database/index readiness failed:', err.message);
    if (err.code === 'PAYMENT_INDEX_DUPLICATE_DATA') {
      console.error('[startup] Run: node scripts/reportOpenCheckoutDuplicates.js');
    }
    process.exit(1);
  });
}

module.exports = {
  NextifyServer,
  bootstrap,
  port,
};
