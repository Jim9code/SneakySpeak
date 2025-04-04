const express = require('express');
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

// Verify JWT_SECRET is available
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    process.exit(1);
}

// Initialize Express app
const app = express();

// Trust proxy - important for Railway
app.set('trust proxy', 1);

// Basic health check that doesn't require database
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true // Important for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Full health check endpoint for Railway
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    res.status(200).json({ 
      status: 'healthy',
      database: 'connected',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);

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
    throw error; // Let the server handle the error
  }
};

module.exports = { app, initDatabase }; 