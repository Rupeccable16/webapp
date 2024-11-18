const { sequelize } = require("../db");
const { User, Images, Verification } = require("../Models/userModel");
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
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const sns = new SNSClient({region: process.env.AWS_REGION})
const topicArn = process.env.TOPIC_ARN;
const domain = process.env.APP_DOMAIN || "localhost:5000"
const appVersion = "v2"

async function publishMessage(message) {
  const params = {
    Message: JSON.stringify(message),
    TopicArn: topicArn,
  }

  try{
    const command = new PublishCommand(params);
    const result = await sns.send(command);
    //console.log('Message sent successfuly', result)
  } catch (error) {
    //console.log('Error sending message', error);
  }
  
}

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

  dbStartTime2 = Date.now();
  const new_user = await User.create({
    first_name: first_name,
    last_name: last_name,
    email: email,
    password: hashedPass,
  });
  sendMetric("DbCreateLatency", Date.now() - dbStartTime2, req.url, req.method, "Milliseconds");

  const curr_timestamp = Date.now();
  
  const new_token = await Verification.create({
    user_id: new_user.id,
    url: `http://${domain}/${appVersion}/user/activate?token=${new_user.id}`,
    expire_time: '180000'   //in milliseconds (3 min)
  })

  publishMessage({url: new_token.url, email: new_user.email});

  console.log("Created new verification token object", new_token);

  console.log("Here's the url", new_token.url);

  const userResponse = new_user.toJSON();
  delete userResponse.password;
  delete userResponse.verified;

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
  console.log(`end point /${appVersion}/user/self`);
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

exports.handleActivation = async(req,res) => {
  try{
    const curr_time = Date.now()
    //Validate method
    if (req.method!='GET'){
      return res.status(405).send();
    }

    //Extracting token
    const token = req.query.token;

    //Handle absence of token
    if (!token){
      return res.status(400).send();
    }

    console.log('This is the token and req.query', token, req.query);

    // const decoded = jwt.verify(token, proccess.env.JWT_SECRET);
    const verification = await Verification.findOne({ where: {user_id: token}})
    const existing_user = await User.findOne({ where: {id: token}})

    if (existing_user.verified) {
      console.log('User is already verified');
      return res.status(400).send();
    }

    console.log('Found verification entry', verification)

    if (verification){
      console.log('If statement calculating time using .getTime()', curr_time,verification.url_created.getTime(), curr_time - verification.url_created.getTime(), verification.expire_time);
      if (curr_time - verification.url_created.getTime() <= verification.expire_time){
        console.log('Verification not expired')
        

        //Update user to verified
        await User.update(
          {verified: true},
          {where: {id: verification.user_id}}
        )
        // const user = await User.findOne({ where: {id: verification.user_id}})
        // console.log('Found updated user', user);
        return res.status(204).send();

        

      } else {
        console.log('Verification expired');
        return res.status(410).send(); //Gone
      }
    } else {
      console.log('Verification entry not found')
      return res.status(400).send();
    }

  } catch(error){
    console.log(error);
    return res.status(400).send();
  }
}

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

        const s3StartTime = Date.now();
        const reply = await UploadFile(
          req.files[0].buffer,
          contentType,
          contentDisposition,
          authorized_user.id + "/image." + extension
        );
        sendMetric("s3UploadLatency", Date.now() - s3StartTime, req.url, req.method, "Milliseconds");

        //console.log('S3 Bucket REPLY' ,reply)
        const s3StartTime2 = Date.now();
        const getUrlReply = await GetPreSignedUrl(
          authorized_user.id + "/image." + extension
        );
        sendMetric("s3UploadLatency", Date.now() - s3StartTime2, req.url, req.method, "Milliseconds");
        //console.log(getUrlReply);
        
        const dbStartTime2 = Date.now();
        const new_user = await Images.create({
          file_name: "image." + extension,
          url: getUrlReply,
          user_id: authorized_user.id,
        });
        sendMetric("DbCreateLatency", Date.now() - dbStartTime2, req.url, req.method, "Milliseconds");

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
      const s3StartTime = Date.now();
      const s3Reply = await DeleteObject(key);
      sendMetric("s3UploadLatency", Date.now() - s3StartTime, req.url, req.method, "Milliseconds");
      //console.log(s3Reply);
      const dbStartTime2 = Date.now();
      const rdsReply = await Images.destroy({
        where: {
          user_id: authorized_user.id,
        },
      });
      sendMetric("DbDeleteLatency", Date.now() - dbStartTime2, req.url, req.method, "Milliseconds");

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
