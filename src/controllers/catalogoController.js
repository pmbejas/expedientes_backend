const catalogoService = require('../services/catalogoService');

// Helper wrapper to avoid try-catch rep
const safeCall = (fn) => async (req, res) => {
  try {
    const result = await fn();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const safeCallParam = (fn) => async (req, res) => {
  try {
    const result = await fn(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const safeCallId = (fn) => async (req, res) => {
  try {
    const result = await fn(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const safeCallIdBody = (fn) => async (req, res) => {
  try {
    const result = await fn(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getJuzgados: safeCall(catalogoService.getJuzgados),
  createJuzgado: safeCallParam(catalogoService.createJuzgado),
  updateJuzgado: safeCallIdBody(catalogoService.updateJuzgado),
  deleteJuzgado: safeCallId(catalogoService.deleteJuzgado),

  getDelitos: safeCall(catalogoService.getDelitos),
  createDelito: safeCallParam(catalogoService.createDelito),
  updateDelito: safeCallIdBody(catalogoService.updateDelito),
  deleteDelito: safeCallId(catalogoService.deleteDelito),

  getInstructores: safeCall(catalogoService.getInstructores),
  createInstructor: safeCallParam(catalogoService.createInstructores),
  updateInstructor: safeCallIdBody(catalogoService.updateInstructor),
  deleteInstructor: safeCallId(catalogoService.deleteInstructor),

  getJueces: safeCall(catalogoService.getJueces),
  createJuez: safeCallParam(catalogoService.createJuez),
  updateJuez: safeCallIdBody(catalogoService.updateJuez),
  deleteJuez: safeCallId(catalogoService.deleteJuez),

  getRelatores: safeCall(catalogoService.getRelatores),
  createRelator: safeCallParam(catalogoService.createRelator),
  updateRelator: safeCallIdBody(catalogoService.updateRelator),
  deleteRelator: safeCallId(catalogoService.deleteRelator),

  getEstados: safeCall(catalogoService.getEstados)
};
