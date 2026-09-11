const path = require('node:path');
const { Sequelize } = require('sequelize');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true,
});

const requiredVariables = [
  'INVENTORY_DB_HOST',
  'INVENTORY_DB_PORT',
  'INVENTORY_DB_NAME',
  'INVENTORY_DB_USER',
  'INVENTORY_DB_PASSWORD',
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const sequelize = new Sequelize(
  process.env.INVENTORY_DB_NAME,
  process.env.INVENTORY_DB_USER,
  process.env.INVENTORY_DB_PASSWORD,
  {
    host: process.env.INVENTORY_DB_HOST,
    port: Number(process.env.INVENTORY_DB_PORT),
    dialect: 'postgres',
    logging: false,
  },
);

module.exports = sequelize;
