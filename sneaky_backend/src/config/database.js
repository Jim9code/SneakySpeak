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
        console.error('Database configuration missing in environment variables');
        process.exit(1);
    }

    return `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME}`;
}

const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false,
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
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });

// Test the connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Sync all models with existing tables (don't recreate tables)
        await sequelize.sync({ alter: false });
        console.log('Database models synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
}

// Only test connection if not in test environment
if (process.env.NODE_ENV !== 'test') {
    testConnection();
}

module.exports = sequelize; 