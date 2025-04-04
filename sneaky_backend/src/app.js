const express = require('express');
const app = express();

// Absolute minimal health check - must be first and completely independent
app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

// Now load everything else
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const { initializeDatabase } = sequelize;

// Load routes
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
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Database health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ 
            status: 'healthy',
            database: 'connected',
            env: {
                frontend_url: process.env.FRONTEND_URL ? 'set' : 'missing',
                db_host: process.env.DB_HOST ? 'set' : 'missing',
                jwt_secret: process.env.JWT_SECRET ? 'set' : 'missing'
            }
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
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

module.exports = { app, initializeDatabase }; 