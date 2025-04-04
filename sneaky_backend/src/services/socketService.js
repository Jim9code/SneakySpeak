const { Server } = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');

let io;

async function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', async (socket) => {
        console.log('User connected:', socket.id);

        // Handle joining the chat room
        socket.on('join_chat', async (userData) => {
            socket.join('main_room');
            socket.userData = userData;
            console.log(`${userData.username} joined the chat`);

            // Send recent messages to the newly connected user
            try {
                const recentMessages = await Message.findAll({
                    order: [['created_at', 'DESC']],
                    limit: 50
                });
                
                // Transform messages to match frontend format
                const transformedMessages = recentMessages.map(msg => ({
                    id: msg.id,
                    text: msg.text || '',
                    sender: msg.sender,
                    isAnonymous: msg.is_anonymous,
                    type: msg.type,
                    imageUrl: msg.image_url,
                    caption: msg.caption,
                    timestamp: msg.created_at
                }));

                socket.emit('recent_messages', transformedMessages.reverse());

                // Send user's coin balance
                if (userData.userId) {
                    try {
                        const coins = await User.getCoins(userData.userId);
                        socket.emit('coin_balance', { coins });
                    } catch (error) {
                        console.error('Error fetching coin balance:', error);
                    }
                }
            } catch (error) {
                console.error('Error fetching recent messages:', error);
            }
        });

        // Handle new messages
        socket.on('send_message', async (messageData) => {
            try {
                // Check if user has enough coins for anonymous message
                if (messageData.isAnonymous && socket.userData?.userId) {
                    const coinCost = messageData.type === 'meme' ? 4 : 2;
                    try {
                        await User.deductCoins(socket.userData.userId, coinCost);
                        
                        // Get updated coin balance
                        const coins = await User.getCoins(socket.userData.userId);
                        socket.emit('coin_balance', { coins });
                    } catch (error) {
                        console.error('Error deducting coins:', error);
                        socket.emit('error', { message: 'Insufficient coins for anonymous message' });
                        return;
                    }
                }

                // Save message to database with snake_case field names
                const savedMessage = await Message.create({
                    text: messageData.text || '',
                    sender: messageData.sender,
                    is_anonymous: messageData.isAnonymous,
                    type: messageData.type,
                    image_url: messageData.imageUrl,
                    caption: messageData.caption,
                    room_id: 'main_room'
                });

                // Transform the saved message to match frontend format (camelCase)
                const transformedMessage = {
                    id: savedMessage.id,
                    text: savedMessage.text,
                    sender: savedMessage.sender,
                    isAnonymous: savedMessage.is_anonymous,
                    type: savedMessage.type,
                    imageUrl: savedMessage.image_url,
                    caption: savedMessage.caption,
                    timestamp: savedMessage.created_at
                };

                // Broadcast the transformed message to all clients in the room
                io.to('main_room').emit('new_message', transformedMessage);
            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', { message: 'Failed to save message' });
            }
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

module.exports = {
    initializeSocket,
    getIO
}; 