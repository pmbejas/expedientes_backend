const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID del usuario que realizó la acción'
  },
  accion: {
    type: DataTypes.STRING(20), // CREATE, UPDATE, DELETE
    allowNull: false
  },
  entidad: {
    type: DataTypes.STRING(50), // Nombre de la tabla/modelo (e.g., 'Expediente', 'Movimiento')
    allowNull: false
  },
  entidad_id: {
    type: DataTypes.STRING(50), // ID del registro afectado (puede ser int o string)
    allowNull: false
  },
  detalles: {
    type: DataTypes.TEXT, // JSON string con los cambios (previousData, newData)
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  timestamps: false
});

module.exports = AuditLog;
