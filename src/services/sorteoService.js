const { Sorteo, DetalleSorteo, Expediente, Juez, Relator, Usuario, Movimiento, Inhibicion } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database'); // For transaction

/**
 * Genera una propuesta de sorteo para un una lista de expedientes.
 */
const generarPropuesta = async (expedienteIds) => {
  // 1. Fetch Expedientes
  const expedientes = await Expediente.findAll({
    where: { id: expedienteIds },
    include: [{ model: Juez }, { model: Relator }]
  });

  // 2. Prepare Counters for Equity (Jueces)
  const jueces = await Juez.findAll();
  const currentYear = new Date().getFullYear();
  
  const juezLoad = {};
  for (const j of jueces) {
    const count = await Expediente.count({
      where: { juez_id: j.id, anio: currentYear }
    });
    juezLoad[j.id] = count;
  }

  // 3. Group by Family (Numero + Anio)
  const groups = {};
  for (const exp of expedientes) {
    const key = `${exp.numero}-${exp.anio}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(exp);
  }

  const propuesta = [];

  // 4. Iterate Groups
  for (const key in groups) {
    const group = groups[key];
    
    // 3. Process Groups
    // Determine Assignment for the GROUP
    let juezId = null;
    let relatorId = null;
    let tipo = 'Automático';
    let motivo = '';

    const sample = group[0];
    const groupExpIds = group.map(g => g.id);

    // CHECK INHIBITIONS FOR THIS GROUP
    const inhibicionesRequest = await Inhibicion.findAll({
      where: { expediente_id: { [Op.in]: groupExpIds } },
      attributes: ['juez_id']
    });
    const excludedJuecesIds = inhibicionesRequest.map(i => i.juez_id);
    
    // A. Check Unipersonal Case
    if (sample.es_unipersonal && sample.juez_unipersonal_id) {
      if (excludedJuecesIds.includes(sample.juez_unipersonal_id)) {
           tipo = 'Conflicto';
           motivo = `Juez Unipersonal Asignado (ID ${sample.juez_unipersonal_id}) se encuentra INHIBIDO.`;
           juezId = null; // Cannot assign
      } else {
          juezId = sample.juez_unipersonal_id;
          // Relator? Usually Unipersonal judges have their own pool or rotary. 
          // For now, let's leave Relator null or rotary if needed. 
          // User said "only assigned to the designated judge".
          // Let's assume standard rotation for Relator unless specified otherwise.
          tipo = 'Unipersonal';
          motivo = `Asignación obligatoria por trámite Unipersonal`;
      }
    } 
    // B. Check Family Connection in DB (excluding current batch)
    // We only need to check for ONE member of the group to find the family link
    else {
        // 1. Try to find the "Principal" (No Incidente)
        let familiar = await Expediente.findOne({
            where: {
                numero: sample.numero,
                anio: sample.anio,
                [Op.or]: [
                    { incidente: null },
                    { incidente: '' }
                ],
                id: { [Op.notIn]: expedienteIds }, // Exclude any currently being sorted
                juez_id: { [Op.not]: null }
            }
        });

        // 2. If no Principal found, find the FIRST Added Incident (e.g. oldest ID or date)
        if (!familiar) {
            familiar = await Expediente.findOne({
                where: {
                    numero: sample.numero,
                    anio: sample.anio,
                    id: { [Op.notIn]: expedienteIds },
                    juez_id: { [Op.not]: null }
                },
                order: [['id', 'ASC']] // Taking the first one created/entered
            });
        }

        if (familiar) {
            if (excludedJuecesIds.includes(familiar.juez_id)) {
                 // Family Judge is inhibited -> Fallback to Equity (but exclude him)
                 tipo = 'Equidad (Inhibición Fam.)';
                 motivo = `Juez Familiar (ID ${familiar.juez_id}) Inhibido. Se sortea por equidad.`;
                 // Loop below will handle equity excluding this ID
            } else {
                juezId = familiar.juez_id;
                if (familiar.relator_id) relatorId = familiar.relator_id;
                tipo = 'Familia';
                motivo = `Conexidad con Exp. ID ${familiar.id}`;
            }
        } else {
             // No family -> Equity
             tipo = 'Equidad';
             motivo = 'Sorteo por equidad';
        }
    } 
        
        if (!juezId && tipo !== 'Conflicto') {
            // C. Equity Distribution (New Case Family OR Fallback)
            if (tipo === 'Automático') { // Only set if not already set by fallback
                tipo = 'Equidad';
                motivo = 'Sorteo por equidad';
            }
            
            // Find Juez with min load, EXCLUDING INHIBITED
            const candidates = jueces
                .filter(j => !excludedJuecesIds.includes(j.id))
                .map(j => ({ id: j.id, count: juezLoad[j.id] || 0 }));
            
            candidates.sort((a, b) => a.count - b.count);
            
            if (candidates.length > 0) {
                juezId = candidates[0].id;
            } else {
                // All judges inhibited?
                motivo += ' (Todos los jueces parecen estar inhibidos o excluidos)';
            }
            relatorId = null;
        }


    // Apply to ALL members of the group
    for (const exp of group) {
        // Increment load for each item assigned (to keep balance accurate for next iteration)
        if (juezId) {
            juezLoad[juezId] = (juezLoad[juezId] || 0) + 1;
        }

        propuesta.push({
          expediente_id: exp.id,
          expediente_numero: `${exp.numero}/${exp.anio}${exp.incidente ? `/${exp.incidente}` : ''}`,
          caratula: exp.caratula,
          juez_sugerido_id: juezId,
          relator_sugerido_id: relatorId,
          tipo_asignacion: tipo,
          motivo
        });
    }
  }

  return propuesta;
};

/**
 * Guarda la propuesta como Borrador o directamente se puede confirmar luego.
 */
const guardarSorteo = async (usuarioId, items) => {
    // items: array of { expediente_id, juez_sugerido_id, relator_sugerido_id, tipo_asignacion }
    
    // Create Sorteo Header
    const sorteo = await Sorteo.create({
        usuario_id: usuarioId,
        fecha: new Date(),
        estado: 'Borrador'
    });

    // Create Details
    const detalles = items.map(item => ({
        sorteo_id: sorteo.id,
        expediente_id: item.expediente_id,
        juez_sugerido_id: item.juez_sugerido_id,
        relator_sugerido_id: item.relator_sugerido_id,
        tipo_asignacion: item.tipo_asignacion
    }));

    await DetalleSorteo.bulkCreate(detalles);
    
    return getSorteoById(sorteo.id);
};

const getSorteoById = async (id) => {
    return await Sorteo.findByPk(id, {
        include: [
            { 
                model: DetalleSorteo, 
                as: 'Detalles',
                include: [ 
                    { model: Expediente },
                    { model: Juez, as: 'JuezSugerido' }, 
                    { model: Relator, as: 'RelatorSugerido' }
                ]
            },
            { model: Usuario }
        ]
    });
};

/**
 * Confirma un sorteo y aplica los cambios a los expedientes.
 */
const confirmarSorteo = async (sorteoId) => {
    const t = await sequelize.transaction();
    try {
        const sorteo = await Sorteo.findByPk(sorteoId, {
            include: [{ 
                model: DetalleSorteo, 
                as: 'Detalles',
                include: [
                    { model: Juez, as: 'JuezSugerido' },
                    { model: Relator, as: 'RelatorSugerido' }
                ]
            }]
        });
        
        if (!sorteo) throw new Error("Sorteo no encontrado");
        if (sorteo.estado === 'Confirmado') throw new Error("Sorteo ya confirmado");

        for (const detalle of sorteo.Detalles) {
            const exp = await Expediente.findByPk(detalle.expediente_id, { transaction: t });
            
            // Update Expediente
            const updates = {};
            let changed = false;

            // Update Juez
            if (detalle.juez_sugerido_id && exp.juez_id !== detalle.juez_sugerido_id) {
                updates.juez_id = detalle.juez_sugerido_id;
                updates.fecha_asignacion_juez = new Date();
                updates.motivo_asignacion_juez = `Sorteo ID ${sorteoId} (${detalle.tipo_asignacion})`;
                changed = true;

                // Format Date dd-MM-yyyy
                const fechaSorteo = new Date(sorteo.fecha);
                const fechaStr = `${fechaSorteo.getDate().toString().padStart(2, '0')}-${(fechaSorteo.getMonth() + 1).toString().padStart(2, '0')}-${fechaSorteo.getFullYear()}`;
                
                const juezNombre = detalle.JuezSugerido ? `${detalle.JuezSugerido.apellido}, ${detalle.JuezSugerido.nombre}` : 'Desconocido';

                await Movimiento.create({
                    expediente_id: exp.id,
                    estado_anterior_id: exp.estado_actual_id,
                    estado_nuevo_id: exp.estado_actual_id,
                    usuario_id: sorteo.usuario_id,
                    fecha: new Date(),
                    detalle: `Asignación de Juez: ${juezNombre} - Motivo: Asignado mediante sorteo numero ${sorteoId} de fecha ${fechaStr}`
                }, { transaction: t });
            }

            // Update Relator
            if (detalle.relator_sugerido_id && exp.relator_id !== detalle.relator_sugerido_id) {
                updates.relator_id = detalle.relator_sugerido_id;
                updates.fecha_asignacion_relator = new Date();
                updates.motivo_asignacion_relator = `Sorteo ID ${sorteoId} (${detalle.tipo_asignacion})`;
                changed = true;

                const fechaSorteo = new Date(sorteo.fecha);
                const fechaStr = `${fechaSorteo.getDate().toString().padStart(2, '0')}-${(fechaSorteo.getMonth() + 1).toString().padStart(2, '0')}-${fechaSorteo.getFullYear()}`;
                
                const relatorNombre = detalle.RelatorSugerido ? `${detalle.RelatorSugerido.apellido}, ${detalle.RelatorSugerido.nombre}` : 'Desconocido';

                await Movimiento.create({
                    expediente_id: exp.id,
                    estado_anterior_id: exp.estado_actual_id,
                    estado_nuevo_id: exp.estado_actual_id,
                    usuario_id: sorteo.usuario_id,
                    fecha: new Date(),
                    detalle: `Asignación de Relator: ${relatorNombre} - Motivo: Asignado mediante sorteo numero ${sorteoId} de fecha ${fechaStr}`
                }, { transaction: t });
            }

            if (changed) {
                await exp.update(updates, { transaction: t });
            }
        }

        // Update Sorteo Status via Instance Save
        sorteo.estado = 'Confirmado';
        await sorteo.save({ transaction: t });

        await t.commit();
        return sorteo;

    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Actualiza los items de un borrador (para cambios manuales antes de confirmar)
 */
const actualizarDetalles = async (sorteoId, items) => {
    // items: [{ id (detalle_id), juez_sugerido_id, relator_sugerido_id }]
    for (const item of items) {
        await DetalleSorteo.update({
            juez_sugerido_id: item.juez_sugerido_id,
            relator_sugerido_id: item.relator_sugerido_id
            // Maybe update 'tipo_asignacion' to 'Manual' if it changed?
        }, {
            where: { id: item.id, sorteo_id: sorteoId }
        });
    }
    return getSorteoById(sorteoId);
};

const getActiveDraft = async () => {
    const draft = await Sorteo.findOne({
        where: { estado: 'Borrador' },
        include: [{ 
            model: DetalleSorteo, 
            as: 'Detalles',
            include: [
                { model: Juez, as: 'JuezSugerido' },
                { model: Relator, as: 'RelatorSugerido' },
                { model: Expediente}
            ]
        }],
        order: [['fecha', 'DESC']]
    });

    if (!draft) return null;

    // SAW-OFF: Self-Healing Logic for "Stuck" Drafts
    // Check if movements were already created for this Sorteo ID
    // Pattern used in confirmation: "sorteo numero {id} de fecha"
    const existingMov = await Movimiento.findOne({
        where: {
            detalle: { [Op.like]: `%sorteo numero ${draft.id} de fecha%` }
        }
    });

    if (existingMov) {
        console.log(`[Self-Heal] Sorteo ${draft.id} was applied but status is Borrador. Fixing...`);
        await draft.update({ estado: 'Confirmado' });
        return null; // Return null effectively hiding the stuck draft and allowing new ones
    }

    return draft;
};

const deleteDraft = async (id) => {
    const sorteo = await Sorteo.findByPk(id);
    if (!sorteo) throw new Error("Sorteo no encontrado");
    if (sorteo.estado !== 'Borrador') throw new Error("Solo se pueden eliminar borradores");
    
    // Details should auto-delete if cascade configured, but let's be safe or rely on DB
    // Assuming Sequelize paranoid/cascade settings or manual deletion:
    await sorteo.destroy();
    return true;
};

const getAllSorteos = async () => {
    return await Sorteo.findAll({
        where: { estado: 'Confirmado' },
        include: [{ model: Usuario, attributes: ['id', 'nombre', 'email'] }],
        order: [['fecha', 'DESC']]
    });
};

/**
 * Sincroniza el borrador con una nueva lista de expedientes.
 * Elimina los que ya no están y agrega/asigna los nuevos.
 */
/**
 * Sincroniza el borrador con una nueva lista de expedientes.
 * Elimina los que ya no están y agrega/asigna los nuevos.
 * @param {number} sorteoId
 * @param {Array<number>} targetExpedienteIds
 * @param {Object} options - { manualAssignment: boolean }
 */
const syncDraft = async (sorteoId, targetExpedienteIds, options = {}) => {
    const { manualAssignment = false } = options;

    const sorteo = await Sorteo.findByPk(sorteoId, {
        include: [{ model: DetalleSorteo, as: 'Detalles' }]
    });
    
    if (!sorteo) throw new Error("Sorteo no encontrado");
    if (sorteo.estado !== 'Borrador') throw new Error("Solo se pueden editar borradores");

    const currentDetails = sorteo.Detalles;
    const currentExpIds = currentDetails.map(d => d.expediente_id);

    // Normalize input: targetExpedienteIds might be [1, 2] or [{id:1, juez_id:5}, ...]
    // We need a map for overrides
    const overrides = {};
    const targetIds = [];
    
    for (const item of targetExpedienteIds) {
        if (typeof item === 'object' && item.id) {
            targetIds.push(item.id);
            if (item.juez_sugerido_id) {
                overrides[item.id] = {
                    juez_id: item.juez_sugerido_id,
                    relator_id: item.relator_sugerido_id
                };
            }
        } else {
            targetIds.push(item);
        }
    }

    // 1. Identify removals
    const toRemoveIds = currentExpIds.filter(id => !targetIds.includes(id));
    if (toRemoveIds.length > 0) {
        await DetalleSorteo.destroy({
            where: {
                sorteo_id: sorteoId,
                expediente_id: toRemoveIds
            }
        });
    }

    // 2. Identify additions
    const toAddIds = targetIds.filter(id => !currentExpIds.includes(id));
    
    // PREPARE RESPONSE DATA
    const simulationResult = {
        toRemove: toRemoveIds, // IDs
        toAdd: [] // Details Objects
    };

    if (toAddIds.length > 0) {
        // If manualAssignment is true (global flag), strictly Manual for all
        if (manualAssignment) {
            const newDetails = toAddIds.map(expId => ({
                sorteo_id: sorteoId,
                expediente_id: expId,
                juez_sugerido_id: null,
                relator_sugerido_id: null,
                tipo_asignacion: 'Manual'
            }));
            
            if (!options.simulate) {
                await DetalleSorteo.bulkCreate(newDetails);
            } else {
                simulationResult.toAdd = newDetails;
            }
        } else {
            // ORIGINAL LOGIC (Automatic with Family/Equity + Overrides)
            
            // A. Fetch Candidates (Expedientes to Add)
            const expedientesToAdd = await Expediente.findAll({
                where: { id: toAddIds },
                include: [{ model: Juez }, { model: Relator }]
            });

            // B. Calculate CURRENT Virtual Load (DB + Draft)
            const jueces = await Juez.findAll();
            const currentYear = new Date().getFullYear();
            const juezLoad = {};

            // DB Load
            for (const j of jueces) {
                const count = await Expediente.count({
                    where: { juez_id: j.id, anio: currentYear }
                });
                juezLoad[j.id] = count;
            }

            // Draft Load (Remaining items only)
            const remainingDetails = currentDetails.filter(d => !toRemoveIds.includes(d.expediente_id));
            for (const d of remainingDetails) {
                if (d.juez_sugerido_id) {
                    juezLoad[d.juez_sugerido_id] = (juezLoad[d.juez_sugerido_id] || 0) + 1;
                }
            }

            // C. Assign New Items (Grouped)
            const newDetails = [];

            // Group Additions by Family
            const groups = {};
            for (const exp of expedientesToAdd) {
                const key = `${exp.numero}-${exp.anio}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(exp);
            }

            for (const key in groups) {
                const group = groups[key];
                const sample = group[0];

                // Check Overrides first (if ANY member has override, apply to group? Or per item?)
                // Usually overrides come from 'Preview' where user sees individual items.
                // But logic should probably respect the override per item.
                // However, to keep consistency, maybe we should check if the *sample* has override?
                // Let's iterate group members. If one has override, maybe we shouldn't force group logic on it?
                // But the requested feature is "Change judge in preview".
                
                // Let's process the group.
                // 1. Determine common strategy (Family/Automatic)
                // 2. But if specific item has Override, use that instead.

                let commonJuezId = null;
                let commonRelatorId = null;
                let commonTipo = 'Manual';
                let commonMotivo = '';
                let familyFound = false;

                // Priority 0: UNIPERSONAL
                if (sample.es_unipersonal && sample.juez_unipersonal_id) {
                    commonJuezId = sample.juez_unipersonal_id;
                    commonTipo = 'Unipersonal';
                    commonMotivo = 'Asignación obligatoria por trámite Unipersonal';
                    // We skip family checks if it's unipersonal? Usually yes, judge is fixed.
                } else {
                    // A. Check Family in DB
                    let familiar = await Expediente.findOne({
                    where: {
                        numero: sample.numero,
                        anio: sample.anio,
                        juez_id: { [Op.not]: null }
                    }
                });
                
                if (!familiar) {
                    const draftMyFamily = await DetalleSorteo.findOne({
                        where: { sorteo_id: sorteoId },
                        include: [{ 
                            model: Expediente,
                            where: { numero: sample.numero, anio: sample.anio }
                        }]
                    });

                    if (draftMyFamily && draftMyFamily.juez_sugerido_id) {
                        commonJuezId = draftMyFamily.juez_sugerido_id;
                        commonRelatorId = draftMyFamily.relator_sugerido_id; 
                        commonTipo = 'Familia (Borrador)';
                        commonMotivo = `Conexidad con Borrador (Exp. ID ${draftMyFamily.expediente_id})`;
                        familyFound = true;
                    }
                } else {
                     commonJuezId = familiar.juez_id;
                     if (familiar.relator_id) commonRelatorId = familiar.relator_id;
                     commonTipo = 'Familia';
                     commonMotivo = `Conexidad con Exp. ID ${familiar.id}`;
                }

                if (!commonJuezId) {
                    // C. Automatic (Equity)
                    commonTipo = 'Automático';
                    commonMotivo = 'Sorteo automático por equidad';
                    const candidates = jueces.map(j => ({ id: j.id, count: juezLoad[j.id] || 0 }));
                    candidates.sort((a, b) => a.count - b.count);
                    if (candidates.length > 0) {
                        commonJuezId = candidates[0].id;
                    }
                }
            }

                // Apply to Group
                for (const exp of group) {
                    let finalJuezId = commonJuezId;
                    let finalRelatorId = commonRelatorId;
                    let finalTipo = commonTipo;
                    
                    // CHECK OVERRIDE
                    if (overrides[exp.id]) {
                        finalJuezId = overrides[exp.id].juez_id;
                        finalRelatorId = overrides[exp.id].relator_id || finalRelatorId; // Keep relator if not overriden? Or manual?
                        finalTipo = 'Manual';
                    }

                    if (finalJuezId) {
                        juezLoad[finalJuezId] = (juezLoad[finalJuezId] || 0) + 1;
                    }
                    
                    newDetails.push({
                        sorteo_id: sorteoId,
                        expediente_id: exp.id,
                        juez_sugerido_id: finalJuezId,
                        relator_sugerido_id: finalRelatorId,
                        tipo_asignacion: finalTipo,
                        // Helper for simulation return
                        JuezSugerido: jueces.find(j => j.id === finalJuezId), 
                        RelatorSugerido: finalRelatorId ? { id: finalRelatorId } : null
                    });
                }
            }

            if (!options.simulate) {
                if (newDetails.length > 0) {
                    const safeDetails = newDetails.map(d => ({
                        sorteo_id: d.sorteo_id,
                        expediente_id: d.expediente_id,
                        juez_sugerido_id: d.juez_sugerido_id,
                        relator_sugerido_id: d.relator_sugerido_id,
                        tipo_asignacion: d.tipo_asignacion
                    }));
                    await DetalleSorteo.bulkCreate(safeDetails);
                }
            } else {
                simulationResult.toAdd = newDetails;
            }
        }
    }
    
    // Return Simulation Result if requested
    if (options.simulate) {
        return simulationResult;
    }

    return getSorteoById(sorteoId);
};

module.exports = {
  generarPropuesta,
  guardarSorteo,
  getSorteoById,
  actualizarDetalles,
  confirmarSorteo,
  getActiveDraft,
  deleteDraft,
    syncDraft,
    getAllSorteos
};
