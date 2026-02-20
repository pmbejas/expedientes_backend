const express = require('express');
const router = express.Router();
const sorteoController = require('../controllers/sorteoController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// All routes require auth
router.use(verifyToken);

// Generate Proposal (Transient)
router.post('/propuesta', sorteoController.generarPropuesta);

// Save Draft
router.post('/', sorteoController.guardarSorteo);

// Get Active Draft
router.get('/borrador', verifyToken, checkRole(['ADMIN', 'INSTRUCTOR']), sorteoController.getActiveDraft);
router.get('/historial', verifyToken, checkRole(['ADMIN', 'JUEZ', 'RELATOR', 'INSTRUCTOR']), sorteoController.getHistorial); // Allow view access to more roles? Keep strict for now or open up.
// Get by ID
router.get('/:id', verifyToken, checkRole(['ADMIN', 'INSTRUCTOR']), sorteoController.getSorteo);

// Update Draft Details
router.put('/:id/detalles', sorteoController.actualizarDetalles);

// Confirm Sorteo
router.put('/:id/confirmar', sorteoController.confirmarSorteo);

// Delete Draft
router.delete('/:id', sorteoController.deleteDraft);

// Sync Draft (Add/Remove items)
router.put('/:id/sync', sorteoController.syncDraft);

module.exports = router;
