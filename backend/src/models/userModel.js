import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';
import pkg from 'bcryptjs';

const { genSalt, hash, compare } = pkg;



const User = dbClient.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'unknown'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    defaultValue: null
  },
}, {
  tableName: 'users',
  timestamps: true
});

User.beforeCreate(async (user) => {
  if (user.password_hash) {
    const salt = await genSalt(10);
    user.password_hash = await hash(user.password_hash, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password_hash')) {
    const salt = await genSalt(10);
    user.password_hash = await hash(user.password_hash, salt);
  }
});

User.prototype.validatePassword = async function(password) {
  return compare(password, this.password_hash);
};


export default User;
