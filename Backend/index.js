const express = require ('express')
require ('dotenv').config()
const cors = require('cors')
const route = require('./routes/route')
require('./dbConnect/dbConnect')

const NextifyServer = express()
const port = process.env.PORT || 5000;

NextifyServer.use(cors())
NextifyServer.use(express.json({ limit: '200mb' }));
NextifyServer.use(express.urlencoded({ limit: '200mb', extended: true }));
NextifyServer.use(route)

NextifyServer.get('/', (req, res) => {
  res.status(200).send(`<h1>NextifyServer running at PORT=${port} and waiting for client request</h1>`);
})

NextifyServer.listen(port, () => {
  console.log(`NextifyServer running at PORT=${port} and waiting for client request`);
})