const sequelize = require('./app/config/database');
const createRabbitConnection = require('./app/config/rabbitmq');
const startBillingConsumer = require('./app/consumers/billing.consumer');

let rabbitConnection;
let shuttingDown = false;

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();

  const rabbit = await createRabbitConnection();
  rabbitConnection = rabbit.connection;

  rabbitConnection.on('error', (error) => {
    console.error('RabbitMQ connection error:', error.message);
  });
  rabbitConnection.on('close', () => {
    if (!shuttingDown) {
      console.error('RabbitMQ connection closed unexpectedly');
      process.exit(1);
    }
  });

  await startBillingConsumer(rabbit.channel, rabbit.queueName);
  console.log(`Billing consumer is waiting on queue ${rabbit.queueName}`);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down Billing consumer`);

  if (rabbitConnection) await rabbitConnection.close();
  await sequelize.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch(async (error) => {
  console.error('Billing consumer failed to start:', error.message);
  await sequelize.close();
  process.exit(1);
});
