const { randomUUID } = require('node:crypto');

const movies = [];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

exports.findAll = (request, response) => {
  const title = typeof request.query.title === 'string'
    ? request.query.title.trim().toLowerCase()
    : '';

  const result = title
    ? movies.filter((movie) => movie.title.toLowerCase().includes(title))
    : movies;

  return response.status(200).json(result);
};

exports.create = (request, response) => {
  const { title, description } = request.body;

  if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
    return response.status(400).json({
      error: 'title and description must be non-empty strings',
    });
  }

  const movie = {
    id: randomUUID(),
    title: title.trim(),
    description: description.trim(),
  };

  movies.push(movie);
  return response.status(200).json(movie);
};

exports.deleteAll = (_request, response) => {
  movies.length = 0;
  return response.status(200).json({ message: 'All movies were deleted' });
};

exports.findOne = (request, response) => {
  const movie = movies.find((item) => item.id === request.params.id);

  if (!movie) {
    return response.status(404).json({ error: 'Movie not found' });
  }

  return response.status(200).json(movie);
};

exports.update = (request, response) => {
  const movie = movies.find((item) => item.id === request.params.id);

  if (!movie) {
    return response.status(404).json({ error: 'Movie not found' });
  }

  const hasTitle = Object.hasOwn(request.body, 'title');
  const hasDescription = Object.hasOwn(request.body, 'description');

  if (!hasTitle && !hasDescription) {
    return response.status(400).json({
      error: 'At least one of title or description is required',
    });
  }

  if (
    (hasTitle && !isNonEmptyString(request.body.title))
    || (hasDescription && !isNonEmptyString(request.body.description))
  ) {
    return response.status(400).json({
      error: 'title and description must be non-empty strings',
    });
  }

  if (hasTitle) movie.title = request.body.title.trim();
  if (hasDescription) movie.description = request.body.description.trim();

  return response.status(200).json(movie);
};

exports.deleteOne = (request, response) => {
  const movieIndex = movies.findIndex((item) => item.id === request.params.id);

  if (movieIndex === -1) {
    return response.status(404).json({ error: 'Movie not found' });
  }

  movies.splice(movieIndex, 1);
  return response.status(200).json({ message: 'Movie was deleted' });
};
