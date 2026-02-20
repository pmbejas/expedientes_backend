const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inhibicion = sequelize.define('Inhibicion', {
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
  juez_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'jueces',
      key: 'id'
    }
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fecha_inhibicion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'inhibiciones',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Inhibicion;
