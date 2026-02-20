const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Public or Protected? Let's protect edits to Admin
// Reads can be public or authenticated.

router.get('/juzgados', catalogoController.getJuzgados);
router.post('/juzgados', verifyToken, checkRole(['ADMIN']), catalogoController.createJuzgado);
router.put('/juzgados/:id', verifyToken, checkRole(['ADMIN']), catalogoController.updateJuzgado);
router.delete('/juzgados/:id', verifyToken, checkRole(['ADMIN']), catalogoController.deleteJuzgado);

router.get('/delitos', catalogoController.getDelitos);
router.post('/delitos', verifyToken, checkRole(['ADMIN']), catalogoController.createDelito);
router.put('/delitos/:id', verifyToken, checkRole(['ADMIN']), catalogoController.updateDelito);
router.delete('/delitos/:id', verifyToken, checkRole(['ADMIN']), catalogoController.deleteDelito);

router.get('/estados', catalogoController.getEstados);

router.get('/instructores', catalogoController.getInstructores);
router.post('/instructores', verifyToken, checkRole(['ADMIN']), catalogoController.createInstructor);
router.put('/instructores/:id', verifyToken, checkRole(['ADMIN']), catalogoController.updateInstructor);
router.delete('/instructores/:id', verifyToken, checkRole(['ADMIN']), catalogoController.deleteInstructor);

router.get('/jueces', catalogoController.getJueces);
router.post('/jueces', verifyToken, checkRole(['ADMIN']), catalogoController.createJuez);
router.put('/jueces/:id', verifyToken, checkRole(['ADMIN']), catalogoController.updateJuez);
router.delete('/jueces/:id', verifyToken, checkRole(['ADMIN']), catalogoController.deleteJuez);

router.get('/relatores', catalogoController.getRelatores);
router.post('/relatores', verifyToken, checkRole(['ADMIN']), catalogoController.createRelator);
router.put('/relatores/:id', verifyToken, checkRole(['ADMIN']), catalogoController.updateRelator);
router.delete('/relatores/:id', verifyToken, checkRole(['ADMIN']), catalogoController.deleteRelator);

module.exports = router;
