const sorteoService = require('../services/sorteoService');

const generarPropuesta = async (req, res) => {
  try {
    const { expedientes } = req.body; // Array of IDs
    if (!expedientes || !Array.isArray(expedientes)) {
        return res.status(400).json({ message: 'Se requiere un array de expedientes' });
    }
    const prop = await sorteoService.generarPropuesta(expedientes);
    res.json(prop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar propuesta', error: error.message });
  }
};

const guardarSorteo = async (req, res) => {
    try {
        const { items } = req.body; // Array of items
        const usuarioId = req.user.id;
        const sorteo = await sorteoService.guardarSorteo(usuarioId, items);
        res.status(201).json(sorteo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar sorteo', error: error.message });
    }
};

const getSorteo = async (req, res) => {
    try {
        const sorteo = await sorteoService.getSorteoById(req.params.id);
        if (!sorteo) return res.status(404).json({ message: 'Sorteo no encontrado' });
        res.json(sorteo);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener sorteo', error: error.message });
    }
};

const actualizarDetalles = async (req, res) => {
    try {
        const { items } = req.body;
        const sorteo = await sorteoService.actualizarDetalles(req.params.id, items);
        res.json(sorteo);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar detalles', error: error.message });
    }
};

const confirmarSorteo = async (req, res) => {
    try {
        const sorteo = await sorteoService.confirmarSorteo(req.params.id);
        res.json(sorteo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al confirmar sorteo', error: error.message });
    }
};

const getHistorial = async (req, res) => {
    try {
        const historial = await sorteoService.getAllSorteos();
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener historial', error: error.message });
    }
};

module.exports = {
    generarPropuesta,
    guardarSorteo,
    getSorteo,
    actualizarDetalles,
    confirmarSorteo,
    getHistorial,
    getActiveDraft: async (req, res) => {
        try {
            const draft = await sorteoService.getActiveDraft();
            if (!draft) return res.status(204).send(); // No Content
            res.json(draft);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al buscar borrador', error: error.message });
        }
    },
    deleteDraft: async (req, res) => {
        try {
            await sorteoService.deleteDraft(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Error al eliminar borrador', error: error.message });
        }
    },
    syncDraft: async (req, res) => {
        try {
            const { expedientes, simulate } = req.body;
            if (!expedientes || !Array.isArray(expedientes)) {
                return res.status(400).json({ message: 'Se requiere array de expedientes' });
            }
            const result = await sorteoService.syncDraft(req.params.id, expedientes, { simulate: !!simulate });
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al sincronizar borrador', error: error.message });
        }
    }
};
