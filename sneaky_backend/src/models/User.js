const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  school_domain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false,
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['school_domain']
    }
  ]
});

// Static methods
User.findByEmail = async function(email) {
  console.log('[User Debug] Finding user by email:', email);
  const user = await this.findOne({ where: { email } });
  console.log('[User Debug] Found user:', user ? user.toJSON() : null);
  return user;
};

User.updateLastLogin = async function(id) {
  console.log('[User Debug] Updating last login for user:', id);
  const result = await this.update(
    { last_login: sequelize.literal('CURRENT_TIMESTAMP') },
    { where: { id } }
  );
  console.log('[User Debug] Update result:', result);
  return result;
};

User.updateUsername = async function(userId, newUsername) {
  console.log('[User Debug] Updating username for user:', userId, 'to:', newUsername);
  const result = await this.update(
    { username: newUsername },
    { where: { id: userId } }
  );
  console.log('[User Debug] Update result:', result);
  return result;
};

// Coin management methods
User.deductCoins = async function(userId, amount) {
  try {
    console.log('[Coins Debug] Starting coin deduction:', { userId, amount });
    
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('[Coins Debug] User not found for deduction:', userId);
      throw new Error('User not found');
    }

    console.log('[Coins Debug] Current coins:', user.coins);
    if (user.coins < amount) {
      console.error('[Coins Debug] Insufficient coins:', { current: user.coins, needed: amount });
      throw new Error('Insufficient coins');
    }

    const newBalance = user.coins - amount;
    console.log('[Coins Debug] Updating coins to:', newBalance);

    const [updatedRows] = await User.update(
      { coins: newBalance },
      { 
        where: { 
          id: userId,
          coins: user.coins // Ensure no concurrent updates
        }
      }
    );

    if (updatedRows === 0) {
      console.error('[Coins Debug] No rows updated during deduction');
      throw new Error('Failed to update coins');
    }

    // Verify the update
    const updatedUser = await User.findByPk(userId);
    console.log('[Coins Debug] Deduction complete:', { 
      oldBalance: user.coins, 
      deducted: amount, 
      newBalance: updatedUser.coins 
    });

    return updatedUser.coins;
  } catch (error) {
    console.error('[Coins Debug] Error in deductCoins:', error);
    throw error;
  }
};

User.addCoins = async function(userId, amount) {
  try {
    console.log('[Coins Debug] Starting coin addition:', { userId, amount });
    
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('[Coins Debug] User not found for addition:', userId);
      throw new Error('User not found');
    }

    console.log('[Coins Debug] Current coins:', user.coins);
    const newBalance = user.coins + amount;
    console.log('[Coins Debug] Updating coins to:', newBalance);

    const [updatedRows] = await User.update(
      { coins: newBalance },
      { 
        where: { 
          id: userId,
          coins: user.coins // Ensure no concurrent updates
        }
      }
    );

    if (updatedRows === 0) {
      console.error('[Coins Debug] No rows updated during addition');
      throw new Error('Failed to update coins');
    }

    // Verify the update
    const updatedUser = await User.findByPk(userId);
    console.log('[Coins Debug] Addition complete:', { 
      oldBalance: user.coins, 
      added: amount, 
      newBalance: updatedUser.coins 
    });

    return updatedUser.coins;
  } catch (error) {
    console.error('[Coins Debug] Error in addCoins:', error);
    throw error;
  }
};

User.getCoins = async function(userId) {
  try {
    console.log('[Coins Debug] Getting coins for user:', userId);
    const user = await User.findByPk(userId, {
      attributes: ['id', 'coins', 'username', 'email']
    });
    
    if (!user) {
      console.error('[Coins Debug] User not found for getting coins:', userId);
      throw new Error('User not found');
    }
    
    console.log('[Coins Debug] Found user:', user.toJSON());
    console.log('[Coins Debug] Current coins:', user.coins);
    return user.coins;
  } catch (error) {
    console.error('[Coins Debug] Error in getCoins:', error);
    throw error;
  }
};

// Ensure the table exists
User.sync({ alter: true })
  .then(() => console.log('[User Model] User table synchronized'))
  .catch(err => console.error('[User Model] Error synchronizing User table:', err));

module.exports = User; 