const express = require('express');

const app = express();
const port = process.env.INVENTORY_PORT || 8080;
const movies = [];

app.use(express.json());

app.get('/api/movies', (_request, response) => {
  response.status(200).json(movies);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Inventory API is listening on port ${port}`);
});
