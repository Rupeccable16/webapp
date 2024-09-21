
//Setting up express app
const express = require('express');
const app = express();
const router = express.Router();

//Parse requests with json payloads
app.use(express.json());

//To read env variables
require('dotenv').config();

//DB related stuff

// const healthzRoutes = require('./Routes/HealtzRoutes');

// //Process /healthz request
// app.use('/healthz',healthzRoutes);

// //For any other request, send 404
// app.all('*', (req,res) => {
//     res.status(404).send();
// })

module.exports = app