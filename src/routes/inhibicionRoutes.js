const express = require('express');
const router = express.Router();
const controller = require('../controllers/inhibicionController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken); // Protect all routes

router.get('/', controller.getInhibiciones);
router.post('/', controller.addInhibicion);
router.delete('/:id', controller.removeInhibicion);

module.exports = router;
