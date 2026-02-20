const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('ADMIN', 'INSTRUCTOR', 'SECRETARIO', 'JUEZ', 'RELATOR'),
    allowNull: false,
    defaultValue: 'INSTRUCTOR'
  },
  // If the user belongs to a specific vocalia (e.g. SECRETARIO)
  vocalia_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID de la vocalia (Juez) a la que pertenece si aplica'
  }
}, { tableName: 'usuarios' });

module.exports = Usuario;
