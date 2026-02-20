const express = require('express');
const router = express.Router();
const expedienteController = require('../controllers/expedienteController');
const movimientoController = require('../controllers/movimientoController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Expedientes
router.get('/', verifyToken, expedienteController.getExpedientes);
router.get('/:id', verifyToken, expedienteController.getExpedienteById);
router.post('/', verifyToken, checkRole(['ADMIN', 'INSTRUCTOR']), expedienteController.crearExpediente);
router.put('/:id', verifyToken, checkRole(['ADMIN', 'INSTRUCTOR']), expedienteController.updateExpediente);

// Sorteo
router.post('/:id/sorteo', verifyToken, checkRole(['ADMIN', 'INSTRUCTOR']), expedienteController.sortearJuez);

// Movimientos
router.get('/:id/movimientos', verifyToken, movimientoController.getHistorial);
router.post('/:id/movimientos', verifyToken, movimientoController.registrarMovimiento); 
// Note: Frontend should pass expediente_id in body match :id or we merge here? 
// Controller expects body.expediente_id. Let's send body.

module.exports = router;
