const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const catalogoRoutes = require('./catalogoRoutes');
const expedienteRoutes = require('./expedienteRoutes');
const auditRoutes = require('./auditRoutes');

router.use('/auth', authRoutes);
router.use('/catalogos', catalogoRoutes);
router.use('/expedientes', expedienteRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/sorteos', require('./sorteoRoutes'));
router.use('/circulacion', require('./circulacionRoutes'));
router.use('/inhibiciones', require('./inhibicionRoutes'));

module.exports = router;
