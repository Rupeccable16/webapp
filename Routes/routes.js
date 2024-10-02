const express = require('express');
const router = express.Router();
const healthzController = require('../Controllers/healthzController');
const userController = require('../Controllers/userController');
const basicAuth = require('../Middleware/basicAuth');

//Custom error handling for invalid json body
const jsonErrorHandler = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        
        return res.status(400).send();  // No body
    }
    next(); 
};

//Parse json requests and handle any errors
router.use(express.json());
router.use(jsonErrorHandler);

router.all('/healthz',healthzController.healthz);
router.all('/v1/user',userController.createUser);
router.all('/v1/user/self', basicAuth.authorize, userController.handleUserRequest);
//router.all('/v1/user/self', basicAuth.authorize, userController.handleUserRequest);


//All endpoints other than above mentioned are rejected
router.all('*', (req,res) => {
    res.status(404).send();
})

module.exports = router;