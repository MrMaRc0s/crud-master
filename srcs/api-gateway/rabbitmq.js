const amqp = require('amqplib');
const config = require('./config');

let connection;
let channel;
let connectionPromise;

function clearConnection() {
  connection = undefined;
  channel = undefined;
}

async function connect() {
  if (channel) return channel;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    connection = await amqp.connect({
      protocol: 'amqp',
      hostname: config.rabbitmq.hostname,
      port: config.rabbitmq.port,
      username: config.rabbitmq.username,
      password: config.rabbitmq.password,
    });

    connection.on('error', (error) => {
      console.error('Gateway RabbitMQ connection error:', error.message);
    });
    connection.on('close', clearConnection);

    channel = await connection.createConfirmChannel();
    await channel.assertQueue(config.rabbitmq.queueName, { durable: true });
    return channel;
  })();

  try {
    return await connectionPromise;
  } catch (error) {
    clearConnection();
    throw error;
  } finally {
    connectionPromise = undefined;
  }
}

async function publishBillingMessage(payload) {
  const confirmChannel = await connect();

  confirmChannel.sendToQueue(
    config.rabbitmq.queueName,
    Buffer.from(JSON.stringify(payload)),
    {
      contentType: 'application/json',
      persistent: true,
    },
  );
  await confirmChannel.waitForConfirms();
}

async function closeRabbitMQ() {
  if (connection) await connection.close();
  clearConnection();
}

module.exports = {
  publishBillingMessage,
  closeRabbitMQ,
};
