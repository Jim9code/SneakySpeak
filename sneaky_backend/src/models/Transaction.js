const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  coins_added: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'paystack'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'transactions',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['reference']
    },
    {
      fields: ['status']
    }
  ]
});

// Static methods
Transaction.findByReference = async function(reference) {
  return await this.findOne({ where: { reference } });
};

Transaction.createTransaction = async function(data) {
  return await this.create({
    user_id: data.userId,
    reference: data.reference,
    amount: data.amount,
    coins_added: data.coins,
    status: 'pending'
  });
};

Transaction.markAsCompleted = async function(reference) {
  return await this.update(
    { status: 'completed' },
    { where: { reference } }
  );
};

Transaction.markAsFailed = async function(reference) {
  return await this.update(
    { status: 'failed' },
    { where: { reference } }
  );
};

module.exports = Transaction; 