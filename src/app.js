const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { conectarDB } = require('./config/database');
const routes = require('./routes');
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

const { auditMiddleware } = require('./services/auditService');
app.use(auditMiddleware);

// Database connection
conectarDB();

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ocurrió un error en el servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0",() => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
