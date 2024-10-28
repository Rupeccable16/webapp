const bcrypt = require("bcrypt");
const { User } = require("../Models/userModel");
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()}).any();

exports.uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer specific errors
      console.log('Multer error:', err);
      return res.status(400).json({ error: 'Multer error occurred during upload.' });
    } else if (err) {
      // Handle other errors
      console.log('Some other error:', err);
      return res.status(500).json({ error: 'An unknown error occurred during upload.' });
    } 
    
    // Proceed to the next middleware
    next();
  });
};

exports.authorize = async (req, res, next) => {
  //Reject requests with no headers or wrong request type
  console.log("Processing basic auth")
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    return res.status(401).send();
  }

  const base64Creds = req.headers.authorization.split(" ")[1];
  const credentials = Buffer.from(base64Creds, "base64").toString("ascii");
  const [email, password] = credentials.split(":");
  const user = await User.findOne({ where: { email: email } });

  if (!user){
    console.log("Unauthorized User Token");
    return res.status(401).send(); //Unauthorized access
  }
  const passAuth = await bcrypt.compareSync(password, user.password);

  if (passAuth) {
    req.user = user;
    console.log("Confirmed User Token");
    if ((req.url === '/v1/user/self/pic') && (req.method === 'POST')){
    }

    next();
  } else {
    console.log("Unauthorized User token");
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
