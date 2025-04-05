require('dotenv').config();
const { createServer } = require('http');
const { initializeSocket } = require('./services/socketService');
const { app, initDatabase } = require('./app');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Start server immediately
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
});

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Initialize database in the background
(async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            await initDatabase();
            console.log('Database initialized and connected');
            break;
        } catch (error) {
            retries -= 1;
            console.error(`Database initialization failed (${retries} retries left):`, error);
            if (retries === 0) {
                console.error('Database initialization failed after all retries');
                // Don't exit - let the app continue running for health checks
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
})();

// Handle termination signals
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit - let the app continue running for health checks
    console.error('Continuing to run despite error');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    // Don't exit - let the app continue running for health checks
    console.error('Continuing to run despite error');
}); 