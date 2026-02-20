const { Expediente, Instructor, Estado, Movimiento, Circulacion } = require('../models');
const { sortearJuez, sortearRelator } = require('./sorteoService');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Asigna instructor según la terminación del número.
 */
const asignarInstructor = async (numero) => {
  if (!numero) return null;
  
  // Extract last digit robustly from string or number
  const numeroStr = numero.toString();
  const terminacion = numeroStr.charAt(numeroStr.length - 1);
  
  const instructores = await Instructor.findAll(); // Optimization: could filter in DB but data set is small
  
  for (const inst of instructores) {
    if (inst.terminaciones) {
      // terminaciones stored as "5,6,7" or "5, 6, 7"
      const terms = inst.terminaciones.split(',').map(t => t.trim());
      if (terms.includes(terminacion)) {
        return inst.id;
      }
    }
  }
  return null;
};

const crearExpediente = async (data, usuario) => {
  // data: { numero, anio, incidente, caratula, juzgado_id, delito_id, ... }
  
  // 1. Asignar Instructor
  if (!data.instructor_id) {
    data.instructor_id = await asignarInstructor(data.numero);
  }

  // 2. Set Estado Inicial if not present
  if (!data.estado_actual_id) {
    const estadoIngresado = await Estado.findOne({ where: { nombre: 'Ingresado' } }); // Case sensitive? MariaDB depends on collation.
    if (estadoIngresado) data.estado_actual_id = estadoIngresado.id;
  }

  // 3. Crear Expediente
  // Ensure fecha_estado is set. If not provided, use fecha_ingreso or current date.
  if (!data.fecha_estado) {
      // Parse fecha_ingreso if it exists to ensure valid date, otherwise use NOW
      const baseDate = data.fecha_ingreso ? new Date(data.fecha_ingreso) : new Date();
      data.fecha_estado = baseDate;
  }
  
  console.log("Creating Expediente with payload:", JSON.stringify(data, null, 2));

  const nuevo = await Expediente.create(data);

  // 3.5. Inherit Inhibitions
  // Check for other cases in invalid family (same number/year)
  try {
      // Use local require to avoid circular deps if needed
      const { Inhibicion } = require('../models');
      // Note: Op is already available from top-level import
      
      console.log("Checking inheritance for:", data.numero, data.anio);
      
      const familyExample = await Expediente.findOne({
          where: {
              numero: data.numero,
              anio: data.anio,
              id: { [Op.ne]: nuevo.id } // Exclude self
          },
          include: [{ model: Inhibicion, as: 'Inhibiciones' }]
      });

      if (familyExample && familyExample.Inhibiciones && familyExample.Inhibiciones.length > 0) {
          console.log(`Inheriting ${familyExample.Inhibiciones.length} inhibitions from Exp ID ${familyExample.id}`);
          const newInhibiciones = familyExample.Inhibiciones.map(inh => ({
              expediente_id: nuevo.id,
              juez_id: inh.juez_id,
              motivo: `Heredada de Exp. ${familyExample.numero}/${familyExample.anio} (Original: ${inh.motivo})`,
              usuario_id: usuario ? usuario.id : null,
              fecha_inhibicion: new Date()
          }));
          
          await Inhibicion.bulkCreate(newInhibiciones);
      }
  } catch (err) {
      console.error("Error inheriting inhibitions:", err);
      // We don't block creation, but we log error
  }

  // 4. Create Initial Movement (Automatic)
  if (nuevo.estado_actual_id) {
      await Movimiento.create({
          expediente_id: nuevo.id,
          estado_anterior_id: null,
          estado_nuevo_id: nuevo.estado_actual_id,
          usuario_id: usuario ? usuario.id : null,
          fecha: data.fecha_ingreso || new Date(), // Use entry date as requested
          detalle: 'Ingreso de Expediente a Secretaría Penal'
      });
  }

  return nuevo;
};

const getExpedientes = async (filters = {}, page = 1, limit = 25, orderBy = []) => {
  console.log("getExpedientes called with:", { filters, page, limit, orderBy });
  const where = {};

  // Text Search (Caratula or Number/Year/Incident)
  if (filters.search) {
    const searchTerms = [];

    // 1. Generic Search (Caratula)
    searchTerms.push({ caratula: { [Op.like]: `%${filters.search}%` } });

    // 2. Parsed Search (Number / Year / Incident)
    if (filters.search.includes('/')) {
        console.log("Raw Search:", filters.search);
        const parts = filters.search.split('/').map(p => p.trim());
        // Assume format is Number/Year/Incident...
        const numStr = parts[0];
        const anioStr = parts[1];
        // Capture everything after year as incident, re-joining by '/' if it was split
        const incStr = parts.slice(2).join('/');
        
        console.log("Parsed Parts:", { numStr, anioStr, incStr });

        const structCond = {};
        
        // Number
        if (numStr && !isNaN(parseInt(numStr))) {
            structCond.numero = parseInt(numStr);
        }
        
        // Year
        if (anioStr && !isNaN(parseInt(anioStr))) {
            structCond.anio = parseInt(anioStr);
        }

        // Incident (if present)
        if (incStr && incStr.length > 0) {
            console.log("Applying Incident Filter:", incStr);
            // Using LIKE allows matching "1/37/68" inside a longer field if needed,
            // but effectively filters out "1/37/65" if we search for "68" part.
            // If the user provided the FULL incident "1/37/68", LIKE %1/37/68% won't match "1/37/65".
            structCond.incidente = { [Op.like]: `%${incStr}%` };
        } else {
             console.log("No Incident Filter Applied (Empty incStr)");
        }

        // Only add if we have at least valid criteria
        if (Object.keys(structCond).length > 0) {
            console.log("Adding StructCond to params:", structCond);
            searchTerms.push(structCond);
        }

    } else {
        // Simple Number match (e.g. user typed "12345")
        // Check if input looks like a number
        if (!isNaN(parseInt(filters.search))) {
             searchTerms.push({ numero: parseInt(filters.search) });
        }
        // Also allow partial match on number string?
        searchTerms.push({ '$Expediente.numero$': { [Op.like]: `%${filters.search}%` } });
    }

    where[Op.or] = searchTerms;
  }

  // Exact Match Filters
  if (filters.estado_actual_id && filters.estado_actual_id !== 'todos') {
    where.estado_actual_id = filters.estado_actual_id;
  }
  if (filters.instructor_id && filters.instructor_id !== 'todos') {
    where.instructor_id = filters.instructor_id;
  }
  
  // Relator Filter Logic
  if (filters.relator_id && filters.relator_id !== 'todos') {
    console.log("Applying Relator Filter:", filters.relator_id);
    if (filters.relator_id === 'con_relator') {
      // IS NOT NULL
      where.relator_id = { [Op.ne]: null };
    } else if (filters.relator_id === 'sin_relator') {
       // IS NULL
       where.relator_id = { [Op.eq]: null };
    } else {
      where.relator_id = filters.relator_id;
    }
  }

  // Juez Filter Logic
  if (filters.juez_id && filters.juez_id !== 'todos') {
    if (filters.juez_id === 'sin_juez') {
       where.juez_id = { [Op.eq]: null };
    } else if (filters.juez_id === 'con_juez') {
       where.juez_id = { [Op.ne]: null };
    } else {
       where.juez_id = filters.juez_id;
    }
  }

  // Unipersonal Filters
  if (filters.es_unipersonal === 'true' || filters.es_unipersonal === true) {
      where.es_unipersonal = true;
  }
  if (filters.juez_unipersonal_id && filters.juez_unipersonal_id !== 'todos') {
      where.juez_unipersonal_id = filters.juez_unipersonal_id;
  }

  // Con Proyecto Filter
  if (filters.con_proyecto !== undefined && filters.con_proyecto !== 'todos') {
      where.con_proyecto = (filters.con_proyecto === 'true' || filters.con_proyecto === true);
  }

  // Date Range Filter (Fecha Estado)
  if (filters.fecha_desde || filters.fecha_hasta) {
    where.fecha_estado = {}; 
    if (filters.fecha_desde) {
      console.log("Filtering Fecha Desde:", filters.fecha_desde);
      where.fecha_estado[Op.gte] = new Date(filters.fecha_desde);
    }
    if (filters.fecha_hasta) {
      console.log("Filtering Fecha Hasta:", filters.fecha_hasta);
      // Set end of day for proper inclusion
      const hasta = new Date(filters.fecha_hasta);
      hasta.setHours(23, 59, 59, 999);
      where.fecha_estado[Op.lte] = hasta;
    }
  }

  const offset = (page - 1) * limit;

  // Build Filter Logic
  // Default Sort if empty
  let order = [['fecha_ingreso', 'DESC']];
  
  if (orderBy && orderBy.length > 0) {
      // Expecting orderBy to be an array of strings like "field,direction"
      // or array of arrays like [['field', 'ASC']] handled by controller?
      // Let's assume controller passes it as array of strings "field:direction" or directly parsed array.
      // If passing as ['fecha_estado', 'DESC'] directly is simpler if handled in controller.
      
      // We'll normalize it here.
      // If it's pure array of arrays: use it.
      // If we need to sort by Association, Sequelize syntax is [Model, 'field', 'ASC']
      
      // Let's map simple field names to Sequelize Syntax
      order = orderBy.map(item => {
          // item could be ['fecha_estado', 'DESC']
          const [field, direction] = item;
          
          if (field === 'relator') {
              return [{ model: require('../models').Relator }, 'apellido', direction];
          }
          if (field === 'estado') {
              return [{ model: require('../models').Estado, as: 'EstadoActual' }, 'nombre', direction];
          }
          if (field === 'fecha_estado' || field === 'fecha_ingreso' || field === 'caratula' || field === 'numero') {
              return [field, direction];
          }
          return [field, direction];
      });
  }

  const { count, rows } = await Expediente.findAndCountAll({
    where,
    attributes: {
        include: [
            [sequelize.literal('(SELECT COUNT(*) FROM inhibiciones WHERE inhibiciones.expediente_id = Expediente.id)'), 'inhibiciones_count']
        ]
    },
    include: [
        { model: require('../models').Juzgado },
        { model: require('../models').Delito },
        { model: require('../models').Instructor },
        { model: require('../models').Relator },
        { model: require('../models').Juez },
        { model: require('../models').Estado, as: 'EstadoActual' }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: order
  });

  // Inject 'can_receive' flag logic
  const resultsWithFlags = await Promise.all(rows.map(async (exp) => {
      const plainExp = exp.get({ plain: true });
      
      // Default: False
      plainExp.can_receive = false;

      // 1. Get Last Circulation
      const lastCirc = await Circulacion.findOne({
          where: { expediente_id: exp.id },
          order: [['fecha_ingreso', 'DESC']]
      });

      if (!lastCirc) {
          // Never circulated -> Already in Secretaria or New
          plainExp.can_receive = false;
      } else if (!lastCirc.fecha_egreso) {
          // Still active in Vocalia (No exit date) -> Locked
          plainExp.can_receive = false;
      } else {
           // Has exited Vocalia. Check if already received.
           const entryAfterExit = await Movimiento.findOne({
               where: { 
                   expediente_id: exp.id,
                   fecha: { [Op.gte]: lastCirc.fecha_egreso },
                   detalle: { [Op.like]: '%Reingreso a Secretaría%' }
               }
           });
           
           if (!entryAfterExit) {
               plainExp.can_receive = true;
           }
      }
      return plainExp;
  }));

  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    expedientes: resultsWithFlags
  };
};

const getExpedienteById = async (id) => {
  return await Expediente.findByPk(id, {
    include: [
      { all: true }, // Include direct associations (Juzgado, Delito, etc.)
      {
        model: Movimiento,
        include: [
          { model: require('../models').Usuario }, // Include User
          { model: require('../models').Estado, as: 'EstadoNuevo' } // Include State
        ]
      }
    ]
  });
};

const sortearYAsignar = async (id) => {
  const expediente = await Expediente.findByPk(id);
  if (!expediente) throw new Error('Expediente no encontrado');

  const juezId = await sortearJuez(expediente.numero, expediente.anio);
  const relatorId = await sortearRelator(expediente.numero, expediente.anio);

  expediente.juez_id = juezId;
  expediente.relator_id = relatorId;
  
  await expediente.save();
  return expediente;
};



const updateExpediente = async (id, data, usuario) => {
  const expediente = await Expediente.findByPk(id);
  if (!expediente) throw new Error('Expediente no encontrado');

  // Check if State is changing
  if (data.estado_actual_id && parseInt(data.estado_actual_id) !== expediente.estado_actual_id) {
    await Movimiento.create({
      expediente_id: id,
      estado_anterior_id: expediente.estado_actual_id,
      estado_nuevo_id: data.estado_actual_id,
      usuario_id: usuario ? usuario.id : null,
      fecha: data.fecha_estado || new Date(),
      detalle: data.motivo_estado || 'Cambio de estado manual'
    });
    // Update date in expediente if provided or now
    expediente.fecha_estado = data.fecha_estado || new Date();
  }

  // Check if Relator is being assigned/changed
  if (data.relator_id) {
    // Record assignment details in Expediente
    expediente.relator_id = data.relator_id; 
    expediente.fecha_asignacion_relator = data.fecha_asignacion_relator || new Date();
    expediente.motivo_asignacion_relator = data.motivo_asignacion_relator;
    
    // Create Audit Movement
    if (usuario) {
      // Use the models imported at the top level. 
      // If circular dependency is an issue, consider lazy loading but correctly.
      // However, Relator/Juez are catalogs, usually safe.
      // Let's use the local require to be safe but verify path.
      
      const { Relator, Juez } = require('../models');

      const relator = await Relator.findByPk(data.relator_id);
      await Movimiento.create({
        expediente_id: id,
        estado_anterior_id: expediente.estado_actual_id,
        estado_nuevo_id: expediente.estado_actual_id, 
        usuario_id: usuario.id,
        fecha: data.fecha_asignacion_relator || new Date(),
        detalle: `Asignación de Relator: ${relator ? relator.nombre : 'Desconocido'} - Motivo: ${data.motivo_asignacion_relator || 'Sin motivo'}`
      });
    }
  }

  // Check if Juez is being assigned/changed
  if (data.juez_id) {
    if (parseInt(data.juez_id) !== expediente.juez_id) {
       // Check Inhibition
       const { Inhibicion } = require('../models');
       const inhibicion = await Inhibicion.findOne({
           where: {
               expediente_id: id,
               juez_id: data.juez_id
           }
       });

       if (inhibicion) {
           throw new Error(`NO SE PUEDE ASIGNAR: El Juez seleccionado se encuentra INHIBIDO. Motivo: ${inhibicion.motivo}`);
       }
    }
    
    // Record assignment details in Expediente
    expediente.juez_id = data.juez_id;
    expediente.fecha_asignacion_juez = data.fecha_asignacion_juez || new Date();
    expediente.motivo_asignacion_juez = data.motivo_asignacion_juez;
    
    // Create Audit Movement
    if (usuario) {
      const { Juez } = require('../models');
      const juez = await Juez.findByPk(data.juez_id);
      await Movimiento.create({
        expediente_id: id,
        estado_anterior_id: expediente.estado_actual_id,
        estado_nuevo_id: expediente.estado_actual_id, 
        usuario_id: usuario.id,
        fecha: data.fecha_asignacion_juez || new Date(),
        detalle: `Asignación de Juez: ${juez ? `${juez.nombre} ${juez.apellido}` : 'Desconocido'} - Motivo: ${data.motivo_asignacion_juez || 'Sin motivo'}`
      });
    }
  }

  await expediente.update(data);
  return await getExpedienteById(id);
};

module.exports = {
  crearExpediente,
  getExpedientes,
  getExpedienteById,
  sortearYAsignar,
  updateExpediente
};
