const { Circulacion, MovimientoInterno, Expediente, Juez, Usuario, Movimiento, Inhibicion } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Get all expedientes currently in the specified Vocalía (not yet exited)
 */
const getActiveInVocalia = async (vocaliaId) => {
  return await Circulacion.findAll({
    where: {
      vocalia_id: vocaliaId,
      fecha_egreso: null // Currently active
    },
    include: [
      { model: Expediente },
      { model: Usuario, as: 'UsuarioIngreso', attributes: ['nombre'] }
    ],
    order: [['fecha_ingreso', 'DESC']]
  });
};

/**
 * Get internal movements for a specific circulation record
 */
const getMovimientosInternos = async (circulacionId, vocaliaId) => {
    // Verify ownership?
    const circ = await Circulacion.findByPk(circulacionId);
    if (!circ || circ.vocalia_id !== parseInt(vocaliaId)) {
        throw new Error('Access Denied');
    }
    
    return await MovimientoInterno.findAll({
        where: { circulacion_id: circulacionId },
        include: [{ model: Usuario, attributes: ['nombre'] }],
        order: [['fecha', 'DESC']]
    });
};

/**
 * Receive an Expediente in the Vocalía (Locking mechanism)
 */
const recibirExpediente = async (expedienteId, observacion, usuario, fechaIngreso) => {
  const t = await sequelize.transaction();
  try {
    // Helper to get local date (00:00:00) from string or date object
    const toLocalDate = (d) => {
        if (typeof d === 'string' && d.includes('-')) {
             const [y, m, day] = d.split('-').map(Number);
             return new Date(y, m - 1, day);
        }
        const date = new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const inputDate = fechaIngreso ? toLocalDate(fechaIngreso) : toLocalDate(new Date());
    const today = toLocalDate(new Date());

    if (inputDate > today) {
        throw new Error('La fecha de recepción no puede ser futura.');
    }

    // 1. Check Unipersonal Restriction
    const expediente = await Expediente.findByPk(expedienteId);
    if (!expediente) throw new Error('Expediente no encontrado');

    if (expediente.es_unipersonal && expediente.juez_unipersonal_id) {
        // We need to compare specific IDs.
        // Assuming usuario.vocalia_id represents the Judge's ID (which seems to be the pattern in this system)
        // OR we need to fetch the Juez entity to match vocalia. 
        // Based on previous code: vocalia_id IS the Juez ID basically.
        if (parseInt(usuario.vocalia_id) !== parseInt(expediente.juez_unipersonal_id)) {
             // We can try to get names for better error
             const juezAsignado = await Usuario.findByPk(expediente.juez_unipersonal_id);
             const nombreJuez = juezAsignado ? `${juezAsignado.apellido}, ${juezAsignado.nombre}` : 'Juez Asignado';
             throw new Error(`Este expediente es de Trámite Unipersonal y solo puede ser recibido por la vocalía del Dr/a. ${nombreJuez}.`);
        }
    }

    // 1.5. Check Inhibitions
    // Check if the current Vocalía (Judge) is Inhibited for this case
    // 1.5. Check Inhibitions
    // Check if the current Vocalía (Judge) is Inhibited for this case
    if (usuario.vocalia_id) {
        console.log(`Checking Inhibition: ExpID=${expedienteId}, VocaliaID=${usuario.vocalia_id}`);
        const expIdInt = parseInt(expedienteId);
        const juezIdInt = parseInt(usuario.vocalia_id);

        const inhibicion = await Inhibicion.findOne({
            where: {
                expediente_id: expIdInt,
                juez_id: juezIdInt
            }
        });
        console.log("Inhibicion found:", inhibicion ? inhibicion.toJSON() : "null");

        if (inhibicion) {
            console.error("BLOCKING RECEPTION due to inhibition");
            throw new Error(`IMPOSIBLE RECIBIR: El Juez de esta vocalía se encuentra INHIBIDO en este expediente. Motivo: ${inhibicion.motivo}`);
        }
    } else {
        console.log("No Vocalia ID for user, skipping inhibition check.");
    }

    // 2. Validate Date: Must be >= Last Exit (Ignore time for same-day allowance)
    const lastCirc = await Circulacion.findOne({
        where: { expediente_id: expedienteId, fecha_egreso: { [Op.ne]: null } },
        order: [['fecha_egreso', 'DESC']],
        transaction: t
    });

    if (lastCirc) {
        const lastExitDate = toLocalDate(lastCirc.fecha_egreso);
        if (lastExitDate > inputDate) {
            throw new Error(`La fecha de ingreso no puede ser anterior a la última salida registrada (${lastCirc.fecha_egreso.toLocaleDateString()})`);
        }
    }

    // 3. Create new Circulation record
    const newItem = await Circulacion.create({
      expediente_id: expedienteId,
      vocalia_id: usuario.vocalia_id,
      usuario_ingreso_id: usuario.id,
      fecha_ingreso: inputDate, // Save normalized date or keep generic? Better save full date if "now", but input is date-only.
      // If manual date was entered, it is 00:00. If we want "end of day" logic for strict ordering, we might need care.
      // But user says "same day allowed". Storing 00:00 is fine if we compare everything as dates.
      observaciones: observacion || 'Recepción en Vocalía'
    }, { transaction: t });

    await t.commit();
    return newItem;

  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Register Exit (Release Lock)
 */
const registrarSalida = async (circulacionId, usuario, fechaEgreso) => {
    const item = await Circulacion.findByPk(circulacionId);
    if (!item) throw new Error('Registro no encontrado');
    
    // Security check
    if (item.vocalia_id !== usuario.vocalia_id) throw new Error('No tiene permiso para dar salida a este expediente');
    if (item.fecha_egreso) throw new Error('El expediente ya egresó anteriormente');

    // Helper to get local date
    const toLocalDate = (d) => {
        if (typeof d === 'string' && d.includes('-')) {
             const [y, m, day] = d.split('-').map(Number);
             return new Date(y, m - 1, day);
        }
        const date = new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const inputExitDate = fechaEgreso ? toLocalDate(fechaEgreso) : toLocalDate(new Date());
    const today = toLocalDate(new Date());

    if (inputExitDate > today) {
       throw new Error('La fecha de salida no puede ser futura.');
    }

    const entryDate = toLocalDate(item.fecha_ingreso);

    if (inputExitDate < entryDate) {
        throw new Error(`La fecha de salida no puede ser anterior al ingreso (${item.fecha_ingreso.toLocaleDateString()})`);
    }

    // Update
    item.fecha_egreso = inputExitDate;
    item.usuario_egreso_id = usuario.id;
    await item.save();
    return item;
};

/**
 * Register Internal Movement
 */
const registrarMovimientoInterno = async (circulacionId, detalle, usuario) => {
    const item = await Circulacion.findByPk(circulacionId);
    if (!item) throw new Error('Circulación no encontrada');
    
    // Validations
    if (item.vocalia_id !== usuario.vocalia_id) throw new Error('Permiso denegado');
    if (item.fecha_egreso) throw new Error('No se pueden agregar movimientos a un expediente que ya egresó');

    const mov = await MovimientoInterno.create({
        circulacion_id: circulacionId,
        usuario_id: usuario.id,
        detalle: detalle,
        fecha: new Date()
    });
    
    return mov;
};

/**
 * Full History for an Expediente
 */
/**
 * Full History for an Expediente
 */


/**
 * Get History by Vocalia (All movements in my office)
 */
const getHistorialPorVocalia = async (vocaliaId) => {
    return await Circulacion.findAll({
        where: { vocalia_id: vocaliaId },
        include: [
            { model: Expediente, attributes: ['id', 'numero', 'anio', 'caratula', 'incidente'] },
            { model: Usuario, as: 'UsuarioIngreso', attributes: ['nombre'] },
            { model: Usuario, as: 'UsuarioEgreso', attributes: ['nombre'] },
            { model: MovimientoInterno, as: 'MovimientosInternos', attributes: ['id'] } // Just to check if exists or count
        ],
        order: [['fecha_ingreso', 'DESC']]
    });
};

/**
 * Helper: Find Expediente State for Search
 */
const checkEstadoCirculacion = async (numero) => {
    // Basic search first
    const expediente = await Expediente.findOne({ where: { numero } });
    if (!expediente) return { found: false, message: 'Expediente no encontrado' };

    // Check circulation status
    const active = await Circulacion.findOne({
        where: {
            expediente_id: expediente.id,
            fecha_egreso: null
        },
        include: [{ model: Juez, as: 'Vocalia' }]
    });

    if (active) {
        return { 
            found: true, 
            expediente, 
            status: 'OCCUPIED', 
            location: active.Vocalia, 
            fecha_ingreso: active.fecha_ingreso 
        };
    } else {
        return { 
            found: true, 
            expediente, 
            status: 'FREE' 
        };
    }
};

/**
 * Search Available Expedientes (Not in Active Circulation)
 */
const searchAvailable = async (query) => {
    // 1. Find all active circulation expediente_ids
    const activeCircs = await Circulacion.findAll({
        where: { fecha_egreso: null },
        attributes: ['expediente_id']
    });
    const occupiedIds = activeCircs.map(c => c.expediente_id);

    // 2. Build Search Condition
    const where = {};
    if (occupiedIds.length > 0) {
        where.id = { [Op.notIn]: occupiedIds };
    }

    if (query) {
        const term = query.toLowerCase();
        where[Op.or] = [
             sequelize.where(sequelize.cast(sequelize.col('numero'), 'char'), { [Op.like]: `%${term}%` }),
             { caratula: { [Op.like]: `%${term}%` } }
             // Could add explicit 'incidente' or 'anio' parsing if needed, but simple text search usually covers numbers
        ];
    }

    // 3. Search Available
    // Add condition: Must be sorted (juez_id NOT null OR juez_unipersonal_id NOT null)
    where[Op.and] = [
        {
            [Op.or]: [
                { juez_id: { [Op.ne]: null } },
                { juez_unipersonal_id: { [Op.ne]: null } }
            ]
        }
    ];

    return await Expediente.findAll({
        where,
        limit: 50,
        include: [
            { model: Juez, as: 'Juez' }, // Include for display/verification if needed
            { model: Usuario, as: 'JuezUnipersonal' }
        ]
    });
};

/**
 * Bulk Receive
 */
const recibirMasivo = async (expedienteIds, observacion, usuario, fechaIngreso) => {
    const t = await sequelize.transaction();
    const results = [];
    
    // Helper (same as above)
    const toLocalDate = (d) => {
        if (typeof d === 'string' && d.includes('-')) {
             const [y, m, day] = d.split('-').map(Number);
             return new Date(y, m - 1, day);
        }
        const date = new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const inputDate = fechaIngreso ? toLocalDate(fechaIngreso) : toLocalDate(new Date());
    const today = toLocalDate(new Date());

    if (inputDate > today) {
        throw new Error('Fecha de recepción futura no permitida');
    }
    
    // Pre-fetch all expedientes to check types
    const expedientesDB = await Expediente.findAll({
        where: { id: expedienteIds }
    });
    const expMap = new Map(expedientesDB.map(e => [e.id, e]));
    
    try {
        for (const expId of expedienteIds) {
             // 1. Check Lock (Inside Loop/Transaction)
            const activeCirc = await Circulacion.findOne({
                where: { expediente_id: expId, fecha_egreso: null },
                transaction: t
            });

            if (activeCirc) {
                 if (activeCirc.vocalia_id !== usuario.vocalia_id) {
                     throw new Error(`Expediente ID ${expId} está bloqueado por otra vocalía.`);
                 }
                 continue;
            }

            // 1.5 Unipersonal Check
            const exp = expMap.get(expId);
            const numStr = `${exp.numero}/${exp.anio}${exp.incidente ? `/${exp.incidente}` : ''}`;

            if (exp && exp.es_unipersonal && exp.juez_unipersonal_id) {
                 if (parseInt(usuario.vocalia_id) !== parseInt(exp.juez_unipersonal_id)) {
                      throw new Error(`Expediente ${numStr} es Unipersonal y no corresponde a su vocalía.`);
                 }
            }

            // 1.6 Check Inhibitions
            if (usuario.vocalia_id) {
                const inhibicion = await Inhibicion.findOne({
                    where: {
                        expediente_id: expId,
                        juez_id: usuario.vocalia_id
                    },
                    transaction: t
                });

                if (inhibicion) {
                    throw new Error(`Exp. ${numStr} BLOQUEADO: Juez Inhibido. Motivo: ${inhibicion.motivo}`);
                }
            }

            // 2. Validate Date vs Last Exit
            const lastCirc = await Circulacion.findOne({
                where: { expediente_id: expId, fecha_egreso: { [Op.ne]: null } },
                order: [['fecha_egreso', 'DESC']],
                transaction: t
            });

            if (lastCirc) {
                const lastExitDate = toLocalDate(lastCirc.fecha_egreso);
                if (lastExitDate > inputDate) {
                    throw new Error(`Exp. ${expId}: Fecha ingreso anterior a última salida (${lastCirc.fecha_egreso.toLocaleDateString()})`);
                }
            }

            const newItem = await Circulacion.create({
                expediente_id: expId,
                vocalia_id: usuario.vocalia_id,
                usuario_ingreso_id: usuario.id,
                fecha_ingreso: inputDate,
                observaciones: observacion || 'Recepción Masiva'
            }, { transaction: t });
            
            results.push(newItem);
        }

        await t.commit();
        return results;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Register Re-entry to Secretaría (End of Circulation)
 */
const registrarReingresoSecretaria = async (expedienteId, usuario, observacion) => {
    // 1. Verify if it's currently in circulation? 
    const activeCirc = await Circulacion.findOne({
        where: { expediente_id: expedienteId, fecha_egreso: null }
    });

    if (activeCirc) {
        throw new Error('El expediente figura activo en una Vocalía. Debe registrarse la salida primero.');
    }

    // 2. Check if ALREADY in Secretaria (Last movement was Reingreso)
    const lastMov = await Movimiento.findOne({
        where: { expediente_id: expedienteId },
        order: [['fecha', 'DESC']]
    });

    if (lastMov && lastMov.detalle.includes('Reingreso a Secretaría Penal')) {
         throw new Error('El expediente ya se encuentra recepcionado en Secretaría.');
    }

    const mov = await Movimiento.create({
        expediente_id: expedienteId,
        usuario_id: usuario.id,
        estado_anterior_id: null,
        estado_nuevo_id: null,
        detalle: `Reingreso a Secretaría Penal. ${observacion || ''}`,
        fecha: new Date(),
    });

    return mov;
};

/**
 * Bulk Re-entry to Secretaría
 */
const reingresoMasivo = async (expedienteIds, usuario, observacion) => {
    const t = await sequelize.transaction();
    const results = [];
    
    try {
        for (const expId of expedienteIds) {
            // 1. Check Active Circulation
            const activeCirc = await Circulacion.findOne({
                where: { expediente_id: expId, fecha_egreso: null },
                transaction: t
            });

            if (activeCirc) {
                 throw new Error(`Expediente ID ${expId} está activo en Vocalía. No se puede recepcionar.`);
            }

            // 2. Check if already in Secretaria (Optimization: Check last Mov)
            const lastMov = await Movimiento.findOne({
                where: { expediente_id: expId },
                order: [['fecha', 'DESC']],
                transaction: t
            });

            if (lastMov && lastMov.detalle.includes('Reingreso a Secretaría Penal')) {
                 // Already received. Skip silently.
                 continue;
            }

            const mov = await Movimiento.create({
                expediente_id: expId,
                usuario_id: usuario.id,
                estado_anterior_id: null,
                estado_nuevo_id: null,
                detalle: `Reingreso a Secretaría Penal. ${observacion || ''}`,
                fecha: new Date()
            }, { transaction: t });
            
            results.push(mov);
        }
        
        await t.commit();
        return results;
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

/**
 * Full History for an Expediente (Merged Circulacion + Reingresos)
 */
const getHistorial = async (expedienteId) => {
    // 1. Get Circulation Records
    const circulaciones = await Circulacion.findAll({
        where: { expediente_id: expedienteId },
        include: [
            { model: Juez, as: 'Vocalia', attributes: ['nombre', 'apellido'] },
            { model: Usuario, as: 'UsuarioIngreso', attributes: ['nombre'] },
            { model: Usuario, as: 'UsuarioEgreso', attributes: ['nombre'] },
            { model: MovimientoInterno, as: 'MovimientosInternos', include: [{model: Usuario, attributes:['nombre']}] }
        ],
        raw: false,
        nest: true
    });

    // 2. Get "Reingreso" Movements (and Initial Entry)
    const reingresos = await Movimiento.findAll({
        where: { 
            expediente_id: expedienteId,
            detalle: { 
                [Op.or]: [
                    { [Op.like]: '%Reingreso a Secretaría Penal%' },
                    { [Op.like]: '%Ingreso de Expediente a Secretaría Penal%' }
                ]
            }
        },
        include: [{ model: Usuario, attributes: ['nombre'] }],
        raw: false,
        nest: true
    });

    // 3. Merge and Sort
    // We treat "Reingreso" as a completed pseudo-circulation step for display purposes
    const history = [];

    circulaciones.forEach(c => {
        history.push({
            type: 'CIRCULACION',
            fecha: c.fecha_ingreso, // Sort by entry
            data: c
        });
    });

    reingresos.forEach(r => {
        history.push({
            type: 'REINGRESO',
            fecha: r.fecha,
            data: r
        });
    });

    // Sort Descending
    history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return history;
};

module.exports = {
  getActiveInVocalia,
  getMovimientosInternos,
  recibirExpediente,
  registrarSalida,
  registrarMovimientoInterno,
  getHistorial,
  checkEstadoCirculacion,
  searchAvailable,
  recibirMasivo,
  getHistorialPorVocalia,
  registrarReingresoSecretaria,
  reingresoMasivo
};
