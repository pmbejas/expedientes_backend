const { AsyncLocalStorage } = require('async_hooks');
// const AuditLog = require('../models/AuditLog'); // Removed to avoid circular dependency

const asyncLocalStorage = new AsyncLocalStorage();

const initAuditHooks = (sequelize) => {
  const models = sequelize.models;

  Object.values(models).forEach((model) => {
    if (model.name === 'AuditLog') return; // Don't audit the audit log

    model.addHook('afterCreate', async (instance, options) => {
      await logAction('CREATE', instance, null, options);
    });

    model.addHook('afterUpdate', async (instance, options) => {
      // previous values
      const previousData = instance._previousDataValues;
      await logAction('UPDATE', instance, previousData, options);
    });

    model.addHook('afterDestroy', async (instance, options) => {
      await logAction('DELETE', instance, null, options);
    });
  });
};

const logAction = async (action, instance, previousData, options) => {
  try {
    const store = asyncLocalStorage.getStore();
    const userId = store ? store.get('userId') : null;
    const ip = store ? store.get('ip') : null;

    // Use transaction from options if available to ensure consistency
    const transaction = options.transaction;

    let detalles = null;
    if (action === 'UPDATE' && previousData) {
      // Only log changed fields
      const changes = {};
      const newData = instance.dataValues;
      Object.keys(newData).forEach(key => {
        if (JSON.stringify(newData[key]) !== JSON.stringify(previousData[key])) {
          changes[key] = {
            from: previousData[key],
            to: newData[key]
          };
        }
      });
      detalles = JSON.stringify(changes);
    } else if (action === 'CREATE' || action === 'DELETE') {
        // For create/delete, maybe log the whole object or just ID?
        // Let's log the dataValues for CREATE, and maybe just metadata for DELETE
        detalles = JSON.stringify(instance.toJSON());
    }

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      usuario_id: userId,
      accion: action,
      entidad: instance.constructor.name,
      entidad_id: instance.id ? instance.id.toString() : 'N/A',
      detalles: detalles,
      ip: ip
    }, { transaction });

  } catch (error) {
    console.error('Error creating AuditLog:', error);
    // Don't fail the main operation if logging fails, but log the error
  }
};

const auditMiddleware = (req, res, next) => {
  const store = new Map();
  if (req.user) {
    store.set('userId', req.user.id);
  }
  store.set('ip', req.ip || req.connection.remoteAddress);

  asyncLocalStorage.run(store, () => {
    next();
  });
};

const getAuditStore = () => asyncLocalStorage.getStore();

module.exports = {
  initAuditHooks,
  auditMiddleware,
  getAuditStore
};
