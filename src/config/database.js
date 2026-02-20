const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false, // Set to console.log to see SQL queries
    timezone: '-03:00', // Argentina Time
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const conectarDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Base de datos conectada exitosamente.');
    // await sequelize.sync({ alter: true }); // Removed to prevent ER_TOO_MANY_KEYS on startup
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
  }
};

module.exports = { sequelize, conectarDB };
