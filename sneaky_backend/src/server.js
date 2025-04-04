require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { initializeSocket } = require('./services/socketService');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { app, initDatabase } = require('./app');

const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.set('trust proxy',1)

// Routes
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database first
        await initDatabase();

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer(); 