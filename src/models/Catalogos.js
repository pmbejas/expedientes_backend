const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Juzgado = sequelize.define('Juzgado', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { tableName: 'juzgados', timestamps: false });

const Delito = sequelize.define('Delito', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { tableName: 'delitos', timestamps: false });

const Estado = sequelize.define('Estado', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, { tableName: 'estados', timestamps: false });

const Instructor = sequelize.define('Instructor', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false
  },
  terminaciones: {
    type: DataTypes.STRING, 
    // Stored as "5,6,7" or JSON "[5,6,7]" depending on preference. 
    // String "1,2,3" is simpler for basic CSV storage.
    allowNull: true,
    comment: 'Lista de terminaciones separadas por coma asignadas a este instructor'
  },
  iniciales: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, { tableName: 'instructores', timestamps: false });

// Juez representa una "Vocalia"
const Juez = sequelize.define('Juez', {
  nombre: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vocalia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Numero de vocalia (1-5)'
  }
}, { 
  tableName: 'jueces', 
  timestamps: false
});

const Relator = sequelize.define('Relator', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false
  },
  iniciales: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, { tableName: 'relatores', timestamps: false });

module.exports = {
  Juzgado,
  Delito,
  Estado,
  Instructor,
  Juez,
  Relator
};
