const pool = require('./database.js');

async function runMigrations() {
    try {
        // Add school_domain column if it doesn't exist
        await pool.execute(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS school_domain VARCHAR(255) NOT NULL DEFAULT '',
            ADD INDEX IF NOT EXISTS idx_school_domain (school_domain)
        `);

        // Add last_login column if it doesn't exist
        await pool.execute(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL
        `);

        // Add coins column if it doesn't exist
        await pool.execute(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS coins INT NOT NULL DEFAULT 10
        `);

        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}

module.exports = runMigrations; 