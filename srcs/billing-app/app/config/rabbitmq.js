const path = require('node:path');
const amqp = require('amqplib');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true,
});

const requiredVariables = [
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

async function createRabbitConnection() {
  const connection = await amqp.connect({
    protocol: 'amqp',
    hostname: process.env.RABBITMQ_HOST,
    port: Number(process.env.RABBITMQ_PORT),
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASSWORD,
  });
  const channel = await connection.createChannel();

  await channel.assertQueue(process.env.RABBITMQ_QUEUE, { durable: true });
  await channel.prefetch(1);

  return {
    connection,
    channel,
    queueName: process.env.RABBITMQ_QUEUE,
  };
}

module.exports = createRabbitConnection;
