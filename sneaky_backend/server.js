const { createServer } = require('http');
const dotenv = require('dotenv');

// Load environment variables first, before any other imports
dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'FRONTEND_URL',
  'PAYSTACK_SECRET_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Check database configuration (DATABASE_URL preferred, or legacy individual DB_* vars)
if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME)) {
  missingEnvVars.push('DATABASE_URL');
}

if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Only import app and other modules after env vars are confirmed
const { app, initializeDatabase } = require('./src/app.js');
const { initializeSocket } = require('./src/services/socketService.js');

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

// Start server first to handle health checks
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Then initialize database
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    // Don't exit process, let health checks still work
    // process.exit(1);
  });
