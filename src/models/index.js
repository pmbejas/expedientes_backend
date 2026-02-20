const { sequelize } = require('../config/database');
const { Juzgado, Delito, Estado, Instructor, Juez, Relator } = require('./Catalogos');
const Usuario = require('./Usuario');
const { Expediente, Movimiento } = require('./Expediente');

// --- Expediente Associations ---
Expediente.belongsTo(Juzgado, { foreignKey: 'juzgado_id' });
Expediente.belongsTo(Delito, { foreignKey: 'delito_id' });
Expediente.belongsTo(Estado, { as: 'EstadoActual', foreignKey: 'estado_actual_id' });
Expediente.belongsTo(Instructor, { foreignKey: 'instructor_id' });
Expediente.belongsTo(Juez, { foreignKey: 'juez_id' }); // Juez asignado (Preopinante)
Expediente.belongsTo(Relator, { foreignKey: 'relator_id' });

// --- Movimiento Associations ---
Movimiento.belongsTo(Expediente, { foreignKey: 'expediente_id' });
Expediente.hasMany(Movimiento, { foreignKey: 'expediente_id' });

Movimiento.belongsTo(Estado, { as: 'EstadoAnterior', foreignKey: 'estado_anterior_id' });
Movimiento.belongsTo(Estado, { as: 'EstadoNuevo', foreignKey: 'estado_nuevo_id' });

Movimiento.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// Circulation tracking
Movimiento.belongsTo(Juez, { as: 'VocaliaOrigen', foreignKey: 'vocalia_origen_id' });
Movimiento.belongsTo(Juez, { as: 'VocaliaDestino', foreignKey: 'vocalia_destino_id' });

// --- Usuario Associations ---
Usuario.belongsTo(Juez, { as: 'Vocalia', foreignKey: 'vocalia_id' }); // If user is Secretario of a Vocalia

// --- AuditLog Associations ---
const AuditLog = require('./AuditLog');
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id' });

const { initAuditHooks } = require('../services/auditService');

// Initialize Audit Hooks
initAuditHooks(sequelize);

// --- Sorteo Associations ---
const { Sorteo, DetalleSorteo } = require('./Sorteo');
Sorteo.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Sorteo.hasMany(DetalleSorteo, { foreignKey: 'sorteo_id', as: 'Detalles' });
DetalleSorteo.belongsTo(Sorteo, { foreignKey: 'sorteo_id' });
DetalleSorteo.belongsTo(Expediente, { foreignKey: 'expediente_id' });
DetalleSorteo.belongsTo(Juez, { as: 'JuezSugerido', foreignKey: 'juez_sugerido_id' });

DetalleSorteo.belongsTo(Relator, { as: 'RelatorSugerido', foreignKey: 'relator_sugerido_id' });

// --- Círculacion Associations ---
const Circulacion = require('./Circulacion');
const MovimientoInterno = require('./MovimientoInterno');

Expediente.hasMany(Circulacion, { foreignKey: 'expediente_id', as: 'Circulaciones' });
Circulacion.belongsTo(Expediente, { foreignKey: 'expediente_id' });
Circulacion.belongsTo(Juez, { as: 'Vocalia', foreignKey: 'vocalia_id' });
Circulacion.belongsTo(Usuario, { as: 'UsuarioIngreso', foreignKey: 'usuario_ingreso_id' });
Circulacion.belongsTo(Usuario, { as: 'UsuarioEgreso', foreignKey: 'usuario_egreso_id' });

Circulacion.hasMany(MovimientoInterno, { foreignKey: 'circulacion_id', as: 'MovimientosInternos' });
MovimientoInterno.belongsTo(Circulacion, { foreignKey: 'circulacion_id' });
MovimientoInterno.belongsTo(Usuario, { foreignKey: 'usuario_id' });


const Inhibicion = require('./Inhibicion');
Expediente.hasMany(Inhibicion, { foreignKey: 'expediente_id', as: 'Inhibiciones' });
Inhibicion.belongsTo(Expediente, { foreignKey: 'expediente_id' });

Juez.hasMany(Inhibicion, { foreignKey: 'juez_id', as: 'Inhibiciones' });
Inhibicion.belongsTo(Juez, { foreignKey: 'juez_id' });
Inhibicion.belongsTo(Usuario, { foreignKey: 'usuario_id' });

module.exports = {
  sequelize,
  Juzgado,
  Delito,
  Estado,
  Instructor,
  Juez,
  Relator,
  Usuario,
  Expediente,
  Movimiento,
  Sorteo,
  DetalleSorteo,
  AuditLog: require('./AuditLog'),
  Circulacion,
  MovimientoInterno,
  Inhibicion
};
