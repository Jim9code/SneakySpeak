const { Sequelize } = require('sequelize');
require('dotenv').config();

// Function to get database URL from Railway or local environment
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        // We're in Railway, use the provided DATABASE_URL
        return process.env.DATABASE_URL;
    }

    // We're in local development, construct URL from individual vars
    if (!process.env.DB_NAME || !process.env.DB_USER) {
        console.warn('Database configuration missing in environment variables');
        return null;
    }

    return `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME}`;
}

// Create the Sequelize instance
const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: console.log, // Enable SQL logging
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    })
    : new Sequelize({
        dialect: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME,
        logging: console.log, // Enable SQL logging
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });

// Initialize database connection
const initializeDatabase = async () => {
    try {
        console.log('Attempting to connect to database...');
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Load models before syncing
        require('../models/User');
        require('../models/Message');
        
        console.log('Syncing database models...');
        // Sync all models with force:true to recreate tables
        await sequelize.sync({ alter: true, logging: console.log });
        console.log('Database models synchronized successfully.');

        // Verify tables exist
        const [results] = await sequelize.query('SHOW TABLES');
        console.log('Available tables:', results);

        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
};

// Test the database connection immediately
sequelize.authenticate()
    .then(() => console.log('Initial database connection test successful'))
    .catch(err => console.error('Initial database connection test failed:', err));

// Export the sequelize instance as default export
module.exports = sequelize;
// Also export the initialization function
module.exports.initializeDatabase = initializeDatabase; 