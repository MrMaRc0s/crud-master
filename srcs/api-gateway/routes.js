const express = require('express');
const { publishBillingMessage } = require('./rabbitmq');

const router = express.Router();

router.post('/api/billing', express.json(), async (request, response) => {
  try {
    await publishBillingMessage(request.body);
    return response.status(200).json({ message: 'Billing request queued' });
  } catch (error) {
    console.error('Could not queue billing request:', error.message);
    return response.status(503).json({ error: 'Billing queue unavailable' });
  }
});

module.exports = router;
