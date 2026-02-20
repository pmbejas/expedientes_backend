const { sequelize } = require('../config/database');
const { Juzgado, Delito, Estado, Instructor, Juez, Relator } = require('../models/Catalogos');
const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await sequelize.authenticate();
    
    // Disable FK checks to allow dropping tables
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await sequelize.sync({ force: true }); 
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });

    // Estados
    await Estado.bulkCreate([
      { nombre: 'Ingresado' },
      { nombre: 'Autos a Resolver' },
      { nombre: 'Circulando' },
      { nombre: 'Resuelto' },
      { nombre: 'Devuelto' }
    ]);

    // Juzgados
    await Juzgado.bulkCreate([
      { nombre: 'Juzgado de Garantías 1' },
      { nombre: 'Juzgado de Garantías 2' },
      { nombre: 'Tribunal Oral 1' }
    ]);

    // Delitos
    await Delito.bulkCreate([
      { nombre: 'Robo' },
      { nombre: 'Homicidio' },
      { nombre: 'Estafa' },
      { nombre: 'Lesiones' }
    ]);

    // Instructores
    await Instructor.bulkCreate([
      { nombre: 'Instructor A', terminaciones: '1,2,3' },
      { nombre: 'Instructor B', terminaciones: '4,5,6' },
      { nombre: 'Instructor C', terminaciones: '7,8,9,0' }
    ]);

    // Jueces (Vocalias)
    await Juez.bulkCreate([
      { nombre: 'Juez Vocalia 1', vocalia: 1 },
      { nombre: 'Juez Vocalia 2', vocalia: 2 },
      { nombre: 'Juez Vocalia 3', vocalia: 3 },
      { nombre: 'Juez Vocalia 4', vocalia: 4 },
      { nombre: 'Juez Vocalia 5', vocalia: 5 }
    ]);

    // Relatores
    await Relator.bulkCreate([
      { nombre: 'Relator 1' },
      { nombre: 'Relator 2' },
      { nombre: 'Relator 3' },
      { nombre: 'Relator 4' },
      { nombre: 'Relator 5' }
    ]);

    // Admin User Requested
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('Pano+9417*', salt);
    
    await Usuario.create({
      nombre: 'Pablo Bejas',
      email: 'pmbejas@gmail.com',
      password: password,
      rol: 'ADMIN'
    });

    console.log('Datos de prueba cargados exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error cargando datos:', error);
    process.exit(1);
  }
};

seed();
