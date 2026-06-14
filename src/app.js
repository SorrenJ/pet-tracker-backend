const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth');
const petsRoutes = require('./routes/pets');
const mealsRoutes = require('./routes/meals');
const exerciseRoutes = require('./routes/exercise');
const healthDocsRoutes = require('./routes/healthDocs');
const errorHandler = require('./middleware/errorHandler');
const swaggerDocument = require('./swagger');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PLACEHOLDER: Replace with CDN/cloud storage URLs once cloud storage is configured
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/health-docs', healthDocsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);

module.exports = app;
