const express = require('express');
const { getRecentMessages, getRoomMessages, createMessage } = require('../controllers/messageController.js');

const router = express.Router();

router.get('/recent', getRecentMessages);
router.get('/room/:roomId', getRoomMessages);
router.post('/', createMessage);

module.exports = router; 