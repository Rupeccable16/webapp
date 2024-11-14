const bcrypt = require("bcrypt");
const { User } = require("../Models/userModel");
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()}).any();
const {logger,sendMetric} = require("../logger");

exports.uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    const startTime = req.startTime
    if (err instanceof multer.MulterError) {
      // Handle Multer specific errors
      logger.logError(req.method,req.url,'Facing err'+err);
      console.log('Multer error:', err);

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(400).json({ error: 'Multer error occurred during upload.' });
    } else if (err) {
      logger.logError(req.method,req.url,'Facing err'+err);
      // Handle other errors
      console.log('Some other error:', err);

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(500).json({ error: 'An unknown error occurred during upload.' });
    } 
    
    // Proceed to the next middleware
    next();
  });
};

exports.authorize = async (req, res, next) => {
  const startTime = Date.now();
  //Count increment
  sendMetric("APICallCount", 1, req.url, req.method, "Count");

  //Reject requests with no headers or wrong request type
  console.log("Processing basic auth")
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    logger.logError(req.method,req.url,'Unauthorized token');

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(401).send();
  }

  const base64Creds = req.headers.authorization.split(" ")[1];
  const credentials = Buffer.from(base64Creds, "base64").toString("ascii");
  const [email, password] = credentials.split(":");
  const dbStartTime = Date.now();
  const user = await User.findOne({ where: { email: email } });
  sendMetric("DbFindLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

  if (!user || !user.verified){
    logger.logError(req.method,req.url,'Unauthorized token');
    console.log("Unauthorized/Unverified User Token");

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(401).send(); //Unauthorized access
  }
  const passAuth = await bcrypt.compareSync(password, user.password);

  if (passAuth) {
    req.user = user;
    console.log("Confirmed User Token");
    logger.logInfo(req.method,req.url,'Authorized token');
    req.startTime = startTime
    next();
  } else {
    logger.logError(req.method,req.url,'Unauthorized token');
    console.log("Unauthorized User token");

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(401).send(); //Unauthorized access
  }
};

// const multer = require('multer');

// const storage = multer.memoryStorage(); // Use memory storage or configure for disk storage
// // const fileFilter = (req, file, cb) => {
// //     const allowedTypes = /jpeg|jpg|png/;
// //     const extname = allowedTypes.test(file.mimetype);
// //     if (extname) {
// //         cb(null, true);
// //     } else {
// //         cb(new Error('Only .jpeg, .jpg and .png format allowed!'), false);
// //     }
// // };

// const upload = multer({
//     storage: storage,
//     // fileFilter: fileFilter,
//     limits: { fileSize: 5 * 1024 * 1024 } // Optional: Limit file size (5MB)
// });

// exports.upload = upload;
