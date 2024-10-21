const {Sequelize} = require('sequelize');

const dbuser = process.env.PSQL_USER;
const dbpass = process.env.PSQL_PASS;
const dbname = process.env.PSQL_DBNAME;

const sequelize = new Sequelize(dbname, dbuser, dbpass, {
    dialect: 'postgres',
}) 

const testDbConnection = async() => {
    try{
        await sequelize.authenticate();
        console.log('Connection to database established');
        return true;
    } catch (error) {
        console.log('Unable to connect to database');
        return false;
    }
}
//
module.exports = {sequelize, testDbConnection}

