const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  room_id: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'main_room'
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_anonymous'
  },
  type: {
    type: DataTypes.ENUM('text', 'meme'),
    defaultValue: 'text'
  },
  image_url: {
    type: DataTypes.STRING(1024),
    allowNull: true,
    field: 'image_url'
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'messages',
  timestamps: false,
  underscored: true // This will automatically convert camelCase to snake_case
});

module.exports = Message; 