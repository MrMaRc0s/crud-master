const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

const requiredVariables = [
  'GATEWAY_PORT',
  'INVENTORY_API_URL',
  'RABBITMQ_HOST',
  'RABBITMQ_PORT',
  'RABBITMQ_USER',
  'RABBITMQ_PASSWORD',
  'RABBITMQ_QUEUE',
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

module.exports = {
  gatewayPort: Number(process.env.GATEWAY_PORT),
  inventoryApiUrl: process.env.INVENTORY_API_URL,
  rabbitmq: {
    hostname: process.env.RABBITMQ_HOST,
    port: Number(process.env.RABBITMQ_PORT),
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASSWORD,
    queueName: process.env.RABBITMQ_QUEUE,
  },
};
