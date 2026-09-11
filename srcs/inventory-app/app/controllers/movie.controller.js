const { Op } = require('sequelize');
const Movie = require('../models/movie.model');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function sendDatabaseError(response, error) {
  console.error('Inventory database operation failed:', error.message);
  return response.status(500).json({ error: 'Internal server error' });
}

exports.findAll = async (request, response) => {
  const title = typeof request.query.title === 'string'
    ? request.query.title.trim()
    : '';

  try {
    const where = title
      ? { title: { [Op.iLike]: `%${title}%` } }
      : undefined;
    const movies = await Movie.findAll({ where, order: [['title', 'ASC']] });
    return response.status(200).json(movies);
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};

exports.create = async (request, response) => {
  const { title, description } = request.body;

  if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
    return response.status(400).json({
      error: 'title and description must be non-empty strings',
    });
  }

  try {
    const movie = await Movie.create({
      title: title.trim(),
      description: description.trim(),
    });
    return response.status(200).json(movie);
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};

exports.deleteAll = async (_request, response) => {
  try {
    const deleted = await Movie.destroy({ where: {} });
    return response.status(200).json({
      message: 'All movies were deleted',
      deleted,
    });
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};

exports.findOne = async (request, response) => {
  try {
    const movie = await Movie.findByPk(request.params.id);
    if (!movie) {
      return response.status(404).json({ error: 'Movie not found' });
    }
    return response.status(200).json(movie);
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};

exports.update = async (request, response) => {
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

  try {
    const movie = await Movie.findByPk(request.params.id);
    if (!movie) {
      return response.status(404).json({ error: 'Movie not found' });
    }

    if (hasTitle) movie.title = request.body.title.trim();
    if (hasDescription) movie.description = request.body.description.trim();
    await movie.save();

    return response.status(200).json(movie);
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};

exports.deleteOne = async (request, response) => {
  try {
    const deleted = await Movie.destroy({ where: { id: request.params.id } });
    if (!deleted) {
      return response.status(404).json({ error: 'Movie not found' });
    }
    return response.status(200).json({ message: 'Movie was deleted' });
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};
