const { sequelize } = require("../db");
const { DataTypes } = require("sequelize");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      writeOnly: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    account_created: {
      type: DataTypes.DATE,
      allowNull: false,
      readOnly: true,
      defaultValue: DataTypes.NOW,
    },
    account_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,  //explicitly set to true when verified by user
    }
  },
  {
    timestamps: false,
  }
);

const Images = sequelize.define(
  "Images",
  {
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    upload_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      readOnly: true,
      defaultValue: DataTypes.NOW,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

const Verification = sequelize.define(
  "Verification",
  {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false, 
    },
    url_created: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false     
    },
    expire_time: {
      type: DataTypes.STRING,
      allowNull: false
    }, 
  },
  {
    timestamps: false
  }
)

module.exports = { User, Images, Verification };
