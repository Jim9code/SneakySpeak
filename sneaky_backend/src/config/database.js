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
        logging: console.log,
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
        logging: console.log,
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
        console.log('[Database] Attempting to connect...');
        await sequelize.authenticate();
        console.log('[Database] Connection established successfully.');
        
        // Load models
        const User = require('../models/User');
        const Message = require('../models/Message');
        
        console.log('[Database] Syncing database models...');
        
        // Sync tables without forcing recreation
        await sequelize.sync({ force: false, alter: true });
        console.log('[Database] Database models synchronized successfully.');

        // Verify tables
        const [tables] = await sequelize.query('SHOW TABLES');
        console.log('[Database] Available tables:', tables);

        // Only create test user if no users exist
        try {
            const userCount = await User.count();
            if (userCount === 0) {
                const testUser = await User.create({
                    email: 'test@test.edu',
                    username: 'TestUser',
                    school_domain: 'test.edu',
                    coins: 10
                });
                console.log('[Database] Test user created successfully:', testUser.toJSON());
            } else {
                console.log('[Database] Users already exist, skipping test user creation');
            }
        } catch (error) {
            console.error('[Database] Error checking/creating test user:', error);
        }

        return true;
    } catch (error) {
        console.error('[Database] Initialization error:', error);
        return false;
    }
};

// Test the database connection immediately
sequelize.authenticate()
    .then(() => console.log('Initial database connection test successful'))
    .catch(err => console.error('Initial database connection test failed:', err));

// Export the sequelize instance and initialization function
module.exports = sequelize;
module.exports.initializeDatabase = initializeDatabase; 