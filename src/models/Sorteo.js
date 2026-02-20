const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sorteo = sequelize.define('Sorteo', {
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  estado: {
    type: DataTypes.ENUM('Borrador', 'Confirmado'),
    allowNull: false,
    defaultValue: 'Borrador'
  },
  detalle: {
    type: DataTypes.TEXT, // Using TEXT for simple JSON storage if needed, or just description
    allowNull: true
  }
  // usuario_id FK via association
}, { tableName: 'sorteos' });

const DetalleSorteo = sequelize.define('DetalleSorteo', {
  tipo_asignacion: {
    type: DataTypes.STRING, // 'Familia', 'Equidad', 'Manual'
    allowNull: true
  }
  // sorteo_id FK via association
  // expediente_id FK via association
  // juez_sugerido_id FK via association
  // relator_sugerido_id FK via association
}, { tableName: 'detalle_sorteos' });

module.exports = { Sorteo, DetalleSorteo };
