const { DataTypes, literal } = require('sequelize');
const sequelize = require('../config/database');

const Movie = sequelize.define(
  'Movie',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: literal('gen_random_uuid()'),
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'movies',
    timestamps: false,
  },
);

module.exports = Movie;
