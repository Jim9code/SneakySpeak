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
        console.log('[Socket Debug] User connected:', socket.id);

        // Handle joining the chat room
        socket.on('join_chat', async (userData) => {
            try {
                console.log('[Socket Debug] Join chat request:', userData);
                
                if (!userData || !userData.userId) {
                    console.error('[Socket Debug] Invalid user data:', userData);
                    socket.emit('error', { message: 'Invalid user data' });
                    return;
                }

                // Verify user exists before proceeding
                const user = await User.findByPk(userData.userId);
                if (!user) {
                    console.error('[Socket Debug] User not found in database:', userData.userId);
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                socket.join('main_room');
                socket.userData = {
                    ...userData,
                    verifiedUser: user.toJSON() // Store verified user data
                };
                console.log(`[Socket Debug] ${userData.username} (ID: ${userData.userId}) joined the chat`);

                // Send recent messages to the newly connected user
                try {
                    const recentMessages = await Message.findAll({
                        order: [['created_at', 'DESC']],
                        limit: 50
                    });
                    
                    console.log('[Socket Debug] Fetched recent messages:', recentMessages.length);
                    
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
                    try {
                        const coins = await User.getCoins(user.id);
                        console.log('[Socket Debug] Sending coin balance for user:', user.id, coins);
                        socket.emit('coin_balance', { coins });
                    } catch (error) {
                        console.error('[Socket Debug] Error fetching coin balance:', error);
                        socket.emit('error', { message: 'Error fetching coin balance' });
                    }
                } catch (error) {
                    console.error('[Socket Debug] Error fetching recent messages:', error);
                    socket.emit('error', { message: 'Error fetching recent messages' });
                }
            } catch (error) {
                console.error('[Socket Debug] Error in join_chat:', error);
                socket.emit('error', { message: 'Error joining chat' });
            }
        });

        // Handle new messages
        socket.on('send_message', async (messageData) => {
            try {
                if (!socket.userData?.verifiedUser) {
                    console.error('[Socket Debug] No verified user data found for message:', socket.id);
                    socket.emit('error', { message: 'User not authenticated' });
                    return;
                }

                // Check if user has enough coins for anonymous message
                if (messageData.isAnonymous) {
                    const coinCost = messageData.type === 'meme' ? 4 : 2;
                    try {
                        await User.deductCoins(socket.userData.verifiedUser.id, coinCost);
                        
                        // Get updated coin balance
                        const coins = await User.getCoins(socket.userData.verifiedUser.id);
                        socket.emit('coin_balance', { coins });
                    } catch (error) {
                        console.error('[Socket Debug] Error deducting coins:', error);
                        socket.emit('error', { message: 'Insufficient coins for anonymous message' });
                        return;
                    }
                }

                // Save message to database
                const savedMessage = await Message.create({
                    text: messageData.text || '',
                    sender: messageData.sender,
                    is_anonymous: messageData.isAnonymous,
                    type: messageData.type,
                    image_url: messageData.imageUrl,
                    caption: messageData.caption,
                    room_id: 'main_room'
                });

                console.log('[Socket Debug] Saved new message:', savedMessage.id);

                // Transform the saved message
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

                // Broadcast the message
                io.to('main_room').emit('new_message', transformedMessage);
            } catch (error) {
                console.error('[Socket Debug] Error saving message:', error);
                socket.emit('error', { message: 'Failed to save message' });
            }
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log('[Socket Debug] User disconnected:', socket.id);
        });

        // Handle typing events
        socket.on('typing', () => {
            console.log('[Socket Debug] User typing:', socket.id);
            socket.to('main_room').emit('user_typing');
        });

        socket.on('stop_typing', () => {
            console.log('[Socket Debug] User stopped typing:', socket.id);
            socket.to('main_room').emit('user_stop_typing');
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