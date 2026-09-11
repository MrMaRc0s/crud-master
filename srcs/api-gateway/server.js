const express = require('express');
const config = require('./config');
const inventoryProxy = require('./proxy');
const routes = require('./routes');
const { closeRabbitMQ } = require('./rabbitmq');

const app = express();
let server;

app.use(inventoryProxy);
app.use(routes);

server = app.listen(config.gatewayPort, '0.0.0.0', () => {
  console.log(`API Gateway is listening on port ${config.gatewayPort}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down API Gateway`);
  server.close(async () => {
    await closeRabbitMQ();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
