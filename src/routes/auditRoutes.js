const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Protected route: Only Admins can view audit logs
router.get('/', verifyToken, checkRole(['ADMIN', 'admin']), getLogs);

module.exports = router;
