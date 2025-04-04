const express = require('express');
const app = express();

// Absolute minimal health check - must be first and completely independent
app.get('/health', (_, res) => res.send('OK'));

// Now load everything else
const cors = require('cors');
const dotenv = require('dotenv');
const messageRoutes = require('./routes/messageRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes.js');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const sequelize = require('./config/database');

// Load environment variables
dotenv.config();

// Log missing environment variables but don't exit
const requiredEnvVars = ['JWT_SECRET', 'FRONTEND_URL', 'DATABASE_URL'];
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

// Initialize database connection
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with existing tables
    await sequelize.sync({ alter: false });
    console.log('Database models synchronized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { app, initDatabase }; 