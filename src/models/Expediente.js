const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expediente = sequelize.define('Expediente', {
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  anio: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  incidente: {
    type: DataTypes.STRING,
    allowNull: true
  },
  caratula: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fecha_ingreso: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // We store current status redundantly for quick access to avoid joins on every listing
  estado_actual_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_estado: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_asignacion_relator: {
    type: DataTypes.DATE,
    allowNull: true
  },
  motivo_asignacion_relator: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Assigned personnel
  instructor_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  juez_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_asignacion_juez: {
    type: DataTypes.DATE,
    allowNull: true
  },
  motivo_asignacion_juez: {
    type: DataTypes.STRING,
    allowNull: true
  },
  relator_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  es_unipersonal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  juez_unipersonal_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios', // Assuming Jueces are in 'usuarios' table or 'jueces' view, but usually ID references usuario
      key: 'id'
    }
  },
  con_proyecto: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, { 
  tableName: 'expedientes',
  indexes: [
    {
      unique: true,
      fields: ['numero', 'anio', 'incidente']
    }
  ]
});

const Movimiento = sequelize.define('Movimiento', {
  fecha: {
    type: DataTypes.DATE, // Includes time
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  detalle: {
    type: DataTypes.TEXT,
    allowNull: true
  }
  // Foreign keys defined in associations:
  // expediente_id
  // estado_anterior_id
  // estado_nuevo_id
  // usuario_id
  // vocalia_origen_id (Juez)
  // vocalia_destino_id (Juez)
}, { tableName: 'movimientos' });

module.exports = { Expediente, Movimiento };
