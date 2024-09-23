
//Setting up express app
const express = require('express');
const app = express();

//To read env variables
require('dotenv').config();

//Route all requests to routes.js
const routes = require('./Routes/routes');
app.use('/',routes);

module.exports = app