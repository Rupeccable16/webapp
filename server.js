const app = require('./index');

const port = process.env.PORT;

const server = app.listen(port, () => {
    console.log("Server listening on PORT:", port);
});

module.exports = server;