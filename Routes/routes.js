const express = require('express');
const router = express.Router();
const healthzController = require('../Controllers/healthzController');
const userController = require('../Controllers/userController');
const basicAuth = require('../Middleware/basicAuth');
const {logger,sendMetric} = require('../logger');
const domain = process.env.APP_DOMAIN
const appVersion = "v1"  //Match this with userController's appVersion
// const multer = require('multer');
// const storage = multer.memoryStorage();
// const upload = multer({storage: storage});


//Custom error handling for invalid json body
const jsonErrorHandler = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.logError(req.method,req.url,'Facing invalid json body for api request');
        //logger.log('Facing invalid json body for api request')
        return res.status(400).send();  // No body
    }
    next(); 
};

const multerErr = function (req, res) {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.logError(req.method,req.url,'Facing invalid form body for api request');
        // A Multer error occurred when uploading.
        console.log('Caught MulterError')
      } else if (err) {
        // An unknown error occurred when uploading.
      }
  
      // Everything went fine.
    })
  }

//Parse json requests and handle any errors
router.use(express.json());
router.use(jsonErrorHandler);

router.all('/healthz',healthzController.healthz);
router.all(`/${appVersion}/user`,userController.createUser);
router.get(`/${appVersion}/user/activate`, userController.handleActivation);
router.all(`/${appVersion}/user/self`, basicAuth.authorize, userController.handleUserRequest);
router.post(`/${appVersion}/user/self/pic`,basicAuth.authorize,basicAuth.uploadFile, userController.processPicRequest)
router.get(`/${appVersion}/user/self/pic`, basicAuth.authorize,userController.processPicRequest);
router.delete(`/${appVersion}/user/self/pic`, basicAuth.authorize,userController.processPicRequest);


//All endpoints other than above mentioned are rejected
router.all('*', (req,res) => {
    res.status(404).send();
})

module.exports = router;