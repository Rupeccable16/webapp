const { sequelize } = require("../db");
const { User, Images } = require("../Models/userModel");
const app = require("../index");
const bcrypt = require("bcrypt");
const { UploadFile, GetPreSignedUrl } = require("../awsS3Connect");
const saltRounds = 10;

exports.createUser = async (req, res) => {
  //Cache control set to no cache
  res.setHeader("Cache-Control", "no-cache");

  if (req.method != "POST") {
    return res.status(405).send();
  }

  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !password || !email || password.length < 3) {
    return res.status(400).send();
  }

  const emailExists = await User.findOne({ where: { email: email } });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailExists || !emailRegex.test(email)) {
    console.log("User already exists");
    return res.status(400).send();
  }

  const hashedPass = bcrypt.hashSync(password, saltRounds);

  const new_user = await User.create({
    first_name: first_name,
    last_name: last_name,
    email: email,
    password: hashedPass,
  });

  const userResponse = new_user.toJSON();
  delete userResponse.password;

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
  console.log("end point /v1/user/self");
  try {
    //Cache control set to no cache
    res.setHeader("Cache-Control", "no-cache");

    if (req.method === "GET") {
      //No params
      if (req.headers["content-length"]) {
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
        return res.status(204).send();
      }

      if (password) {
        if (password.length < 3) {
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

      await User.update(updated_user, {
        where: { email: user.email },
      });

      return res.status(204).send();
    } else {
      return res.status(405).send();
    }
  } catch (err) {
    console.log("Catch block of userController.handleRequest", err);
    return res.status(400).send();
  }
};

exports.processPicRequest = async (req, res) => {
  // console.log("req headers", req.headers['content-type']);
  //res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    if (req.method === "POST") {
      console.log(req.files.length);
      if (
        !(
          req.headers["content-type"] &&
          req.headers["content-type"].startsWith("multipart/form-data")
        )
      ) {
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
        const found_user = await Images.findOne({
          where: { user_id: authorized_user.id },
        });
        //console.log("found user having an image uploaded already" ,found_user);
        if (found_user) {
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

        const new_user = await Images.create({
          file_name: "image." + extension,
          url: getUrlReply,
          user_id: authorized_user.id,
        });

        //return proper values,
        const responseToRequest = {
          new_user,
        };
        return res.status(201).send(responseToRequest);
        //add another check in the above if to see if the user already has a profile pic
      } else {
        return res.status(400).send();
      }
    } else if (req.method === "GET") {
      //console.log('Here')
      if (req.headers["content-length"]) {
        return res.status(400).send();
      }

      const authorized_user = req.user.dataValues;
      //console.log(authorized_user);
      const found_user = await Images.findOne({
        where: { user_id: authorized_user.id },
      });
      console.log(found_user)
      if (!found_user){return res.status(404).send()}
      else{
        return res.status(200).send(found_user);
      } 

      //Search associated user's id in the images table, retrieve image from S3(recheck in requirements), send to user
    } else if (req.method === "DELETE") {
      //Reach s3, hard delete from s3, remove entire entry from
    } else {
      return res.status(405).send();
    }
  } catch (err) {
    console.log("Facing err", err);
    return res.status(400).send();
  }
};
