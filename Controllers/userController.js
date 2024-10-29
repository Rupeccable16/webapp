const { sequelize } = require("../db");
const { User, Images } = require("../Models/userModel");
const app = require("../index");
const bcrypt = require("bcrypt");
const { logger, sendMetric } = require("../logger");
const {
  UploadFile,
  GetPreSignedUrl,
  DeleteObject,
} = require("../awsS3Connect");
const { DATE } = require("sequelize");
const saltRounds = 10;

exports.createUser = async (req, res) => {
  //Increment APICount
  const startTime = Date.now();
  sendMetric("APICallCount", 1, req.url, req.method, "Count");

  //Cache control set to no cache
  res.setHeader("Cache-Control", "no-cache");

  if (req.method != "POST") {
    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(405).send();
  }

  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !password || !email || password.length < 3) {
    logger.logError(
      req.method,
      req.url,
      "Facing invalid form body for api request"
    );

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(400).send();
  }

  const dbStartTime = Date.now();
  const emailExists = await User.findOne({ where: { email: email } });
  sendMetric("DbFindLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailExists || !emailRegex.test(email)) {
    logger.logWarn(req.method, req.url, "User already exists");
    console.log("User already exists");

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(400).send();
  }

  const hashedPass = bcrypt.hashSync(password, saltRounds);

  dbStartTime = Date.now();
  const new_user = await User.create({
    first_name: first_name,
    last_name: last_name,
    email: email,
    password: hashedPass,
  });
  sendMetric("DbCreateLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

  const userResponse = new_user.toJSON();
  delete userResponse.password;

  logger.logInfo(req.method, req.url, "Successful API request");

  const timeDuration = Date.now() - startTime;
  sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
  return res.status(201).send(userResponse);
};

exports.getUser = async (req, res) => {
  const user = req.user.dataValues;

  const userResponse = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    account_created: user.account_created,
    account_updated: user.account_updated,
  };

  return res.status(200).send(userResponse);
};

exports.updateUser = async (req, res) => {
  //Authorized user was passed by middleware
  const user = req.user.dataValues;

  const allowedValues = ["first_name", "last_name", "password"];

  let flag = false;
  Object.keys(req.body).forEach((key) => {
    if (!allowedValues.includes(key)) {
      flag = false;
      console.log("Invalid req body for updating user");
    } else {
      flag = true;
    }
  });

  if (!flag) {
    res.status(400).send();
  }

  let { password, first_name, last_name } = req.body;
  if (password) {
    password = await bcrypt.hashSync(password, saltRounds);
  }

  const updated_user = {
    password: password ?? user.password,
    first_name: first_name ?? user.first_name,
    last_name: last_name ?? user.last_name,
    account_updated: sequelize.literal("CURRENT_TIMESTAMP"),
  };

  await User.update(updated_user, {
    where: { email: user.email },
  });

  res.status(200).send();
};

exports.handleUserRequest = async (req, res) => {
  const startTime = req.startTime;
  console.log("end point /v1/user/self");
  try {
    //Cache control set to no cache
    res.setHeader("Cache-Control", "no-cache");

    if (req.method === "GET") {
      //No params
      if (req.headers["content-length"]) {
        logger.logError(
          req.method,
          req.url,
          "Facing invalid form body for api request"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }

      //Get user function
      const user = req.user.dataValues;

      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_created: user.account_created,
        account_updated: user.account_updated,
      };

      logger.logInfo(req.method, req.url, "Successful API request");

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(200).send(userResponse);
    } else if (req.method === "PUT") {
      //Update user function
      const user = req.user.dataValues;

      const allowedValues = ["first_name", "last_name", "password"];

      let flag = false;
      Object.keys(req.body).forEach((key) => {
        if (!allowedValues.includes(key)) {
          flag = false;
          console.log("Invalid req body for updating user");
        } else {
          flag = true;
        }
      });

      if (!flag || !req.body) {

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }

      let { password, first_name, last_name } = req.body;

      let allFieldsSame = true;

      if (password) {
        if (!bcrypt.compareSync(password, user.password)) {
          allFieldsSame = false;
        }
      }

      if (first_name) {
        if (first_name != user.first_name) {
          allFieldsSame = false;
        }
      }

      if (last_name) {
        if (last_name != user.last_name) {
          allFieldsSame = false;
        }
      }

      if (allFieldsSame) {
        console.log("All fields same");
        logger.logWarn(
          req.method,
          req.url,
          "User fields were not updated as they were not changed"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(204).send();
      }

      if (password) {
        if (password.length < 3) {

          const timeDuration = Date.now() - startTime;
          sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
          return res.status(400).send();
        }
        password = await bcrypt.hashSync(password, saltRounds);
      }

      const updated_user = {
        password: password ?? user.password,
        first_name: first_name ?? user.first_name,
        last_name: last_name ?? user.last_name,
        account_updated: sequelize.literal("CURRENT_TIMESTAMP"),
      };

      const dbStartTime = Date.now();
      await User.update(updated_user, {
        where: { email: user.email },
      });
      sendMetric("DbUpdateLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

      logger.logInfo(req.method, req.url, "Successful API request");

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(204).send();
    } else {
      logger.logError(
        req.method,
        req.url,
        "Facing invalid method for api request"
      );

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(405).send();
    }
  } catch (err) {
    logger.logError(req.method, req.url, err);
    console.log("Catch block of userController.handleRequest", err);

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(400).send();
  }
};

exports.processPicRequest = async (req, res) => {
  // console.log("req headers", req.headers['content-type']);
  //res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const startTime = req.startTime
    if (req.method === "POST") {
      //console.log(req.files.length);
      if (
        !(
          req.headers["content-type"] &&
          req.headers["content-type"].startsWith("multipart/form-data")
        )
      ) {
        logger.logError(
          req.method,
          req.url,
          "Facing invalid body for api request"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }

      if (
        req.files &&
        req.files.length === 1 &&
        req.files[0].fieldname === "profilePic" &&
        ["image/jpeg", "image/jpg", "image/png"].includes(req.files[0].mimetype)
      ) {
        const authorized_user = req.user.dataValues;
        //console.log(req.files[0]);
        
        const dbStartTime = Date.now();
        const found_user = await Images.findOne({
          where: { user_id: authorized_user.id },
        });
        sendMetric("DbFindLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");
        //console.log("found user having an image uploaded already" ,found_user);
        if (found_user) {
          logger.logWarn(req.method, req.url, "User already has a profile pic");

          const timeDuration = Date.now() - startTime;
          sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
          return res.status(400).send();
        }

        let extension = "";
        if (req.files[0].mimetype === "image/jpeg") {
          extension = "jpeg";
        } else if (req.files[0].mimetype === "image/png") {
          extension = "png";
        } else {
          extension = "jpg";
        }
        const contentType = "image/" + extension;
        const contentDisposition = "inline";
        const reply = await UploadFile(
          req.files[0].buffer,
          contentType,
          contentDisposition,
          authorized_user.id + "/image." + extension
        );
        //console.log('S3 Bucket REPLY' ,reply)
        const getUrlReply = await GetPreSignedUrl(
          authorized_user.id + "/image." + extension
        );
        //console.log(getUrlReply);
        
        dbStartTime = Date.now();
        const new_user = await Images.create({
          file_name: "image." + extension,
          url: getUrlReply,
          user_id: authorized_user.id,
        });
        sendMetric("DbCreateLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

        //return proper values,
        const responseToRequest = {
          new_user,
        };

        logger.logInfo(req.method, req.url, "Successful API request");

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(201).send(responseToRequest);
        //add another check in the above if to see if the user already has a profile pic
      } else {
        logger.logError(
          req.method,
          req.url,
          "Facing invalid body for api request"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }
    } else if (req.method === "GET") {
      //console.log('Here')
      if (req.headers["content-length"]) {
        logger.logError(
          req.method,
          req.url,
          "Facing invalid body for api request"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }

      const authorized_user = req.user.dataValues;
      //console.log(authorized_user);
      const dbStartTime = Date.now();
      const found_user = await Images.findOne({
        where: { user_id: authorized_user.id },
      });
      sendMetric("DbFindLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");
      //console.log(found_user);
      if (!found_user) {
        logger.logError(req.method, req.url, "No such user found");

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(404).send();
      } else {
        logger.logInfo(req.method, req.url, "Successful API request");

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(200).send(found_user);
      }

      //Search associated user's id in the images table, retrieve image from S3(recheck in requirements), send to user
    } else if (req.method === "DELETE") {
      //https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html - for deleting
      //Reach s3,
      if (req.headers["content-length"]) {
        logger.logError(
          req.method,
          req.url,
          "Facing invalid body for api request"
        );

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(400).send();
      }
      const authorized_user = req.user.dataValues;
      const dbStartTime = Date.now();
      const found_user = await Images.findOne({
        where: { user_id: authorized_user.id },
      });
      sendMetric("DbFindLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");
      if (!found_user) {
        logger.logError(req.method, req.url, "No such user found");

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        return res.status(404).send();
      }

      const key = found_user.user_id + "/" + found_user.file_name;
      //console.log('Constructing key', key);
      const s3Reply = await DeleteObject(key);
      //console.log(s3Reply);
      dbStartTime = Date.now();
      const rdsReply = await Images.destroy({
        where: {
          user_id: authorized_user.id,
        },
      });
      sendMetric("DbDeleteLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

      //console.log("rds reply", rdsReply);

      //hard delete from s3,
      //remove entire entry from
      logger.logInfo(req.method, req.url, "Successful API request");

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(204).send();
    } else {
      logger.logError(
        req.method,
        req.url,
        "Facing invalid method for api request"
      );

      const timeDuration = Date.now() - startTime;
      sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
      return res.status(405).send();
    }
  } catch (err) {
    logger.logError(req.method, req.url, "Facing err" + err);
    console.log("Facing err", err);

    const timeDuration = Date.now() - startTime;
    sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
    return res.status(400).send();
  }
};
