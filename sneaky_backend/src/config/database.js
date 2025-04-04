const { Sequelize } = require('sequelize');
require('dotenv').config();

// Ensure required environment variables are set
if (!process.env.DB_NAME || !process.env.DB_USER) {
    console.error('Database configuration missing in environment variables');
    process.exit(1);
}

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    logging: false, // Disable logging SQL queries
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
        throw error; // Re-throw to be caught by the caller
    }
}

testConnection();

module.exports = sequelize; 