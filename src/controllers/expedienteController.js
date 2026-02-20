const expedienteService = require('../services/expedienteService');

const getExpedientes = async (req, res) => {
  try {
    const { page = 1, limit = 25, search, instructor_id, relator_id, juez_id, estado_actual_id, fecha_desde, fecha_hasta, orderBy } = req.query;

    let filterJuezId = juez_id;

    // RESTRICTION: Secretario can only see expedientes of their Vocalia
    if (req.user.rol === 'SECRETARIO') {
        if (!req.user.vocalia_id) {
             // If Secretario has no assigned Vocalia, they see nothing? or everything? 
             // Safest is NOTHING or Error. user "deben estar asociados".
             // Let's force an impossible ID or handle as empty return.
             // But maybe they are just setting it up. Let's assume strict.
             filterJuezId = -9999; 
        } else {
             filterJuezId = req.user.vocalia_id;
        }
    }
    
    // Parse orderBy string from "field:dir,field2:dir" to [['field','dir'],['field2','dir']]
    // OR if strict array needed by service:
    let orderArray = [];
    if (orderBy) {
        orderArray = orderBy.split(',').map(part => {
            const [field, dir] = part.split(':');
            return [field, dir ? dir.toUpperCase() : 'ASC'];
        });
    }

    const filters = {
      search,
      instructor_id,
      relator_id, 
      juez_id: filterJuezId,
      estado_actual_id,
      fecha_desde, 
      fecha_hasta,
      es_unipersonal: req.query.es_unipersonal,
      juez_unipersonal_id: req.query.juez_unipersonal_id,
      con_proyecto: req.query.con_proyecto
    };

    const result = await expedienteService.getExpedientes(filters, page, limit, orderArray);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExpedienteById = async (req, res) => {
  try {
    const result = await expedienteService.getExpedienteById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Expediente no encontrado' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const crearExpediente = async (req, res) => {
  try {
    const result = await expedienteService.crearExpediente(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const sortearJuez = async (req, res) => {
  try {
    // Assuming ID is passed
    const result = await expedienteService.sortearYAsignar(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateExpediente = async (req, res) => {
  try {
    // RESTRICTION: Secretario/Relator (?) logic
    if (req.user.rol === 'SECRETARIO') {
        const current = await expedienteService.getExpedienteById(req.params.id);
        if (current && current.juez_id !== req.user.vocalia_id) {
            return res.status(403).json({ error: 'No tiene permiso para modificar este expediente (Pertenece a otra Vocalía)' });
        }
    }

    const result = await expedienteService.updateExpediente(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getExpedientes,
  getExpedienteById,
  crearExpediente,
  sortearJuez,
  updateExpediente
};
