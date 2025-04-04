require('dotenv').config();
const { createServer } = require('http');
const { initializeSocket } = require('./services/socketService');
const { app, initDatabase } = require('./app');

const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database first
        await initDatabase();

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Environment:', process.env.NODE_ENV);
            console.log('Frontend URL:', process.env.FRONTEND_URL);
            console.log('Database initialized and connected');
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

startServer(); 