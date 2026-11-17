const express = require('express');
require('dotenv').config();
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

try {
  assertMoyasarCredentials();
} catch (err) {
  console.error('[payments] Moyasar configuration rejected:', err.message);
  process.exit(1);
}

require('./dbConnect/dbConnect');

const NextifyServer = express();
console.log("🔥 INDEX.JS IS RUNNING FROM:", __dirname);
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

const server = NextifyServer.listen(port, () => {
  console.log(`NextifyServer running at PORT=${port} and waiting for client request`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT in Backend/.env to a free port.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
