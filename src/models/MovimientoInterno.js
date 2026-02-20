const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Circulacion = require('./Circulacion');
const Usuario = require('./Usuario');

const MovimientoInterno = sequelize.define('MovimientoInterno', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  circulacion_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'circulacion',
      key: 'id'
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  detalle: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'movimientos_internos',
  timestamps: true
});

module.exports = MovimientoInterno;
