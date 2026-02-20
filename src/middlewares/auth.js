const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization'); // Format: "Bearer <token>"
  
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no provisto.' });

  try {
    // strip "Bearer " if present
    const t = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const verified = jwt.verify(t, process.env.JWT_SECRET);
    req.user = verified;
    console.log("Auth User:", req.user); // DEBUG: Check vocalia_id presence
    
    // Update Audit Store if available
    const { getAuditStore } = require('../services/auditService');
    const store = getAuditStore();
    if (store) {
      store.set('userId', verified.id);
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso prohibido: No tiene los permisos necesarios' });
    }
    next();
  };
};

module.exports = { verifyToken, checkRole };
