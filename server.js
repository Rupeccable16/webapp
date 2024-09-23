const app = require('./index');
require('dotenv').config();

//CHANGE TO IMPORT FROM ENV
const port = process.env.PORT;

const server = app.listen(port, () => {
    console.log("Server listening on PORT:", port);
});

module.exports = server;