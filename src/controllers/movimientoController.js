const movimientoService = require('../services/movimientoService');

const registrarMovimiento = async (req, res) => {
  try {
    // User from auth middleware
    const usuario = req.user; 
    const { id } = req.params;
    const result = await movimientoService.registrarMovimiento({ ...req.body, expediente_id: id }, usuario);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getHistorial = async (req, res) => {
  try {
    const { id } = req.params; // expediente ID
    const result = await movimientoService.getMovimientosExpediente(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registrarMovimiento,
  getHistorial
};
