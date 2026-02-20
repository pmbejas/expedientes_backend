const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Expediente = require('./Expediente');
const Usuario = require('./Usuario');

const Circulacion = sequelize.define('Circulacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expediente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'expedientes',
      key: 'id'
    }
  },
  vocalia_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID del Juez/Vocalía que tiene el expediente'
  },
  fecha_ingreso: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  usuario_ingreso_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Usuario (Secretario) que recibió el expediente',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  fecha_egreso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usuario_egreso_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuario que registró la salida',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  observaciones: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'circulacion',
  timestamps: true 
});

module.exports = Circulacion;
