const path = require('node:path');
const { Sequelize } = require('sequelize');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true,
});

const requiredVariables = [
  'BILLING_DB_HOST',
  'BILLING_DB_PORT',
  'BILLING_DB_NAME',
  'BILLING_DB_USER',
  'BILLING_DB_PASSWORD',
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const sequelize = new Sequelize(
  process.env.BILLING_DB_NAME,
  process.env.BILLING_DB_USER,
  process.env.BILLING_DB_PASSWORD,
  {
    host: process.env.BILLING_DB_HOST,
    port: Number(process.env.BILLING_DB_PORT),
    dialect: 'postgres',
    logging: false,
  },
);

module.exports = sequelize;
