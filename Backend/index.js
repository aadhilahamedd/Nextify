const express = require ('express')
require ('dotenv').config()
const cors = require('cors')
const route = require('./routes/route')
require('./dbConnect/dbConnect')

const NextifyServer = express()
NextifyServer.use(cors())
NextifyServer.use(express.json())
NextifyServer.use(route)



const port = process.env.PORT || 3000
NextifyServer.listen(port,()=>{
    console.log(`NextifyServer rinning at PORT=${port} and waiting  for client request`);
    
})

NextifyServer.get('/',(req,res)=>{
    res.status(200).send(`<h1>NextifyServer running at PORT=${port} and waiting for client request</h1>`);
})