const { sequelize } = require('../models');

const syncDatabase = async () => {
  try {
    // Import models to ensure they are registered (index.js already does this)
    console.log('Iniciando sincronización de la base de datos...');
    
    // alter: true updates the schema to match the models without dropping tables
    // force: true would drop tables (use with caution)
    await sequelize.sync({ alter: true });
    
    console.log('Base de datos sincronizada correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error);
    process.exit(1);
  }
};

syncDatabase();
