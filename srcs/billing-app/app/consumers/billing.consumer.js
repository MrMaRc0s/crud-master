const Order = require('../models/order.model');

function parseOrder(message) {
  const payload = JSON.parse(message.content.toString());
  const userId = Number(payload.user_id);
  const numberOfItems = Number(payload.number_of_items);
  const totalAmount = Number(payload.total_amount);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('user_id must be a positive integer');
  }
  if (!Number.isInteger(numberOfItems) || numberOfItems <= 0) {
    throw new Error('number_of_items must be a positive integer');
  }
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    throw new Error('total_amount must be a non-negative number');
  }

  return {
    user_id: userId,
    number_of_items: numberOfItems,
    total_amount: totalAmount,
  };
}

async function startBillingConsumer(channel, queueName) {
  await channel.consume(
    queueName,
    async (message) => {
      if (!message) return;

      let orderData;
      try {
        orderData = parseOrder(message);
      } catch (error) {
        console.error('Rejected invalid billing message:', error.message);
        channel.nack(message, false, false);
        return;
      }

      try {
        const order = await Order.create(orderData);
        channel.ack(message);
        console.log(`Processed billing order ${order.id}`);
      } catch (error) {
        console.error('Billing database operation failed:', error.message);
        channel.nack(message, false, true);
      }
    },
    { noAck: false },
  );
}

module.exports = startBillingConsumer;
