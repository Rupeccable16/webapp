const bcrypt = require("bcrypt");
const { User } = require("../Models/userModel");

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
    return res.status(401).send(); //Unauthorized
  }
  const passAuth = await bcrypt.compareSync(password, user.password);

  if (passAuth) {
    req.user = user;
    console.log("Confirmed User Token");
    next();
  } else {
    console.log("Unauthorized User token");
    return res.status(401).send(); //Unauthorized
  }
};
