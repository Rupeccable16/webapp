const logger = require('./logger');
//Setting up express app
const express = require('express');
const app = express();

//To read env variables
require('dotenv').config();

//Boostrap db
const { sequelize } = require('./db');
sequelize.sync().then(logger.info('Sequelize SYNCED'));

//Route all requests to routes.js
const routes = require('./Routes/routes');
app.use('/',routes);

module.exports = app