const { sequelize } = require("../db");
const { User } = require("../Models/userModel");
const app = require("../index");
const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.createUser = async (req, res) => {
  
  if (req.method != "POST") {
    return res.status(405).send();
  }

  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !password || !email) {
    return res.status(400).send();
  }

  const emailExists = await User.findOne({ where: { email: email } });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailExists || !emailRegex.test(email)) {
    console.log("User already exists");
    return res.status(400).send();
  }

  //console.log('Details are', first_name,last_name,email,password);

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
  try {
    if (req.method === "GET") {
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

      res.status(204).send();
    } else {
      return res.status(405).send();
    }
  } catch (err) {
    console.log("Catch block of userController.handleRequest");
    return res.status(500);
  }
};
