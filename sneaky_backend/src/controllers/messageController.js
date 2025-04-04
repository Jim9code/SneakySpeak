const Message = require('../models/Message.js');

const getRecentMessages = async (req, res) => {
  try {
    const messages = await Message.getRecentMessages();
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.getMessagesByRoom(roomId);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch room messages' });
  }
};

const createMessage = async (req, res) => {
  try {
    const { text, sender, isAnonymous, type, imageUrl, caption } = req.body;
    const messageId = await Message.create({
      text,
      sender,
      isAnonymous,
      type,
      imageUrl,
      caption
    });
    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
};

module.exports = { getRecentMessages, getRoomMessages, createMessage }; 