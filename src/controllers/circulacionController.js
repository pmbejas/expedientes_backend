const circulacionService = require('../services/circulacionService');

const getActive = async (req, res) => {
  try {
    if (!req.user.vocalia_id) {
        return res.status(400).json({ error: 'Usuario no tiene Vocalía asignada' });
    }
    const result = await circulacionService.getActiveInVocalia(req.user.vocalia_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkStatus = async (req, res) => {
    try {
        const { numero } = req.query;
        if (!numero) return res.status(400).json({ error: 'Número requerido' });
        const result = await circulacionService.checkEstadoCirculacion(numero);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const recibir = async (req, res) => {
    try {
        if (!req.user.vocalia_id) return res.status(403).json({ error: 'Sin Vocalía' });
        const { expediente_id, observacion, fecha_ingreso } = req.body;
        const result = await circulacionService.recibirExpediente(expediente_id, observacion, req.user, fecha_ingreso);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const registrarSalida = async (req, res) => {
    try {
        const { fecha_egreso } = req.body;
        const result = await circulacionService.registrarSalida(req.params.id, req.user, fecha_egreso);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const addMovimientoInterno = async (req, res) => {
    try {
        const { detalle } = req.body;
        const result = await circulacionService.registrarMovimientoInterno(req.params.id, detalle, req.user);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getHistorial = async (req, res) => {
    try {
        const result = await circulacionService.getHistorial(req.params.expediente_id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAvailable = async (req, res) => {
    try {
        const { term } = req.query;
        const result = await circulacionService.searchAvailable(term);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const recibirMasivo = async (req, res) => {
    try {
        if (!req.user.vocalia_id) return res.status(403).json({ error: 'Sin Vocalía' });
        const { expediente_ids, observacion, fecha_ingreso } = req.body;
        if (!expediente_ids || !Array.isArray(expediente_ids)) {
             return res.status(400).json({ error: 'Lista de expedientes requerida' });
        }
        const result = await circulacionService.recibirMasivo(expediente_ids, observacion, req.user, fecha_ingreso);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getMovimientosInternos = async (req, res) => {
    try {
        if (!req.user.vocalia_id) return res.status(403).json({ error: 'Sin Vocalía' });
        const result = await circulacionService.getMovimientosInternos(req.params.id, req.user.vocalia_id);
        res.json(result);
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
};

const getHistorialPorVocalia = async (req, res) => {
    try {
        if (!req.user.vocalia_id) return res.status(403).json({ error: 'Sin Vocalía' });
        const result = await circulacionService.getHistorialPorVocalia(req.user.vocalia_id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registrarReingresoSecretaria = async (req, res) => {
    try {
        const { expediente_id, observacion } = req.body;
        const result = await circulacionService.registrarReingresoSecretaria(expediente_id, req.user, observacion);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const reingresoMasivo = async (req, res) => {
    try {
        const { expediente_ids, observacion } = req.body;
        if (!expediente_ids || !Array.isArray(expediente_ids)) {
            return res.status(400).json({ error: 'Lista de expedientes requerida' });
        }
        const result = await circulacionService.reingresoMasivo(expediente_ids, req.user, observacion);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
  getActive,
  checkStatus,
  recibir,
  registrarSalida,
  addMovimientoInterno,
  getHistorial,
  getAvailable,
  recibirMasivo,
  getMovimientosInternos,
  getHistorialPorVocalia,
  registrarReingresoSecretaria,
  reingresoMasivo
};
