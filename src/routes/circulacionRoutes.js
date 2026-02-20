const express = require('express');
const router = express.Router();
const circulacionController = require('../controllers/circulacionController');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

// 1. Get Active in My Vocalia
router.get('/active', checkRole(['SECRETARIO', 'JUEZ', 'RELATOR']), circulacionController.getActive);

// 2. Search Status by Number (for reception)
router.get('/check-status', checkRole(['SECRETARIO']), circulacionController.checkStatus);

// 3. Receive Expediente (Lock)
router.post('/ingreso', checkRole(['SECRETARIO']), circulacionController.recibir);
router.post('/ingreso-masivo', checkRole(['SECRETARIO']), circulacionController.recibirMasivo);
router.get('/available', checkRole(['SECRETARIO']), circulacionController.getAvailable);

// 4. Register Exit (Unlock)
router.put('/:id/salida', checkRole(['SECRETARIO']), circulacionController.registrarSalida);

// 5. Register Internal Movement
// 5. Register Internal Movement
router.post('/:id/movimiento', checkRole(['SECRETARIO', 'RELATOR']), circulacionController.addMovimientoInterno);
router.get('/:id/movimientos', checkRole(['SECRETARIO', 'RELATOR']), circulacionController.getMovimientosInternos);

// 6. Reingreso a Secretaría (Instructor)
router.post('/reingreso', checkRole(['INSTRUCTOR', 'ADMIN']), circulacionController.registrarReingresoSecretaria);
router.post('/reingreso-masivo', checkRole(['INSTRUCTOR', 'ADMIN']), circulacionController.reingresoMasivo);

// 6. Full History
// 6. Full History
router.get('/historial-vocalia', checkRole(['SECRETARIO', 'JUEZ', 'RELATOR']), circulacionController.getHistorialPorVocalia);
router.get('/historial/:expediente_id', circulacionController.getHistorial);

module.exports = router;
