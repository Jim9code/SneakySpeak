const express = require('express');
const app = express();

// Absolute minimal health check - must be first and completely independent
app.get('/health', (_, res) => res.send('OK'));

// Now load everything else
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const { initializeDatabase } = sequelize;

// Load routes after database is initialized
const messageRoutes = require('./routes/messageRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes.js');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Load environment variables
dotenv.config();

// Log missing environment variables but don't exit
const requiredEnvVars = ['JWT_SECRET', 'FRONTEND_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.warn('Warning: Missing environment variables:', missingEnvVars.join(', '));
}

// Trust proxy - important for Railway
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true // Important for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Database status endpoint
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// Routes with environment variable checks
app.use('/api/messages', (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'Service not fully configured' });
    }
    next();
}, messageRoutes);

app.use('/api/auth', (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'Service not fully configured' });
    }
    next();
}, authRoutes);

app.use('/api/upload', (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'Service not fully configured' });
    }
    next();
}, uploadRoutes);

app.use('/api/payment', (req, res, next) => {
    if (!process.env.JWT_SECRET || !process.env.PAYSTACK_SECRET_KEY) {
        return res.status(503).json({ message: 'Service not fully configured' });
    }
    next();
}, paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = { app, initializeDatabase }; 