const express = require('express');
const movieRoutes = require('./app/routes/movie.routes');

const app = express();
const port = process.env.INVENTORY_PORT || 8080;

app.use(express.json());
app.use('/api/movies', movieRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Inventory API is listening on port ${port}`);
});
