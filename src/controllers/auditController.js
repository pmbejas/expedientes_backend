const { AuditLog, Usuario } = require('../models');
const { Op } = require('sequelize');

const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, usuario_id, accion, entidad, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (accion) where.accion = accion;
    if (entidad) where.entidad = entidad;
    
    // Optional: Search in details or entity_id if needed
    if (search) {
      where[Op.or] = [
        { entidad_id: { [Op.like]: `%${search}%` } },
        { detalles: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Usuario,
          attributes: ['id', 'nombre', 'email', 'rol'] // Corrected attributes matching Usuario model
        }
      ]
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      logs: rows
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
};

module.exports = {
  getLogs
};
