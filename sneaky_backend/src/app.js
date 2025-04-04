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

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true // Important for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
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
    process.exit(1);
  }
};

module.exports = { app, initDatabase }; 