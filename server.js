const app = require('./index');
const {logger,sendMetric} = require('./logger');

const port = process.env.PORT;

const server = app.listen(port, () => {
    //logger.info("App running successfuly");
    console.log("Server listening on PORT:", port);
});

module.exports = server;