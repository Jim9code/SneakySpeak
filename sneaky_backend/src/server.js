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
    let retries = 5;
    
    while (retries > 0) {
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
            
            // If we get here, everything worked
            return;
        } catch (error) {
            retries -= 1;
            console.error(`Failed to start server (${retries} retries left):`, error);
            
            if (retries === 0) {
                console.error('No more retries left, exiting...');
                process.exit(1);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
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

startServer(); 