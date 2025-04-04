const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const PaymentTransaction = sequelize.define('PaymentTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    reference: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Ensure reference can only be used once
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    coins: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paystackResponse: {
        type: DataTypes.JSON,
        allowNull: true
    },
    paidAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'payment_transactions',
    underscored: true // Use snake_case for column names
});

// Define the association
PaymentTransaction.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

module.exports = PaymentTransaction; 