const { createServer } = require('http');
const { app, initializeDatabase } = require('./src/app.js');
const { initializeSocket } = require('./src/services/socketService.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
