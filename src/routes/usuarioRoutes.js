const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Protected Routes (Only Admin can manage users)
router.get('/', verifyToken, checkRole(['ADMIN']), usuarioController.getUsuarios);
router.get('/:id', verifyToken, checkRole(['ADMIN']), usuarioController.getUsuarioById);
router.post('/', verifyToken, checkRole(['ADMIN']), usuarioController.createUsuario);
router.put('/:id', verifyToken, checkRole(['ADMIN']), usuarioController.updateUsuario);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), usuarioController.deleteUsuario);

module.exports = router;
