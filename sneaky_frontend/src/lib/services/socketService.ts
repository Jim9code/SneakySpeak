import { io, Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { authStore } from '../stores/authStore';

interface Message {
    id: number;
    text: string;
    sender: string;
    timestamp: Date;
    isAnonymous: boolean;
    type?: 'text' | 'meme';
    imageUrl?: string;
    caption?: string;
}

class SocketService {
    private socket: Socket | null = null;
    private messageHandlers: ((message: Message) => void)[] = [];
    private recentMessagesHandlers: ((messages: Message[]) => void)[] = [];
    private coinBalanceHandlers: ((data: { coins: number }) => void)[] = [];
    private errorHandlers: ((error: { message: string }) => void)[] = [];
    private typingStartHandlers: (() => void)[] = [];
    private typingStopHandlers: (() => void)[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect() {
        if (this.socket?.connected) return;

        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
        console.log('Environment variables:', {
            VITE_API_URL: import.meta.env.VITE_API_URL,
            isDevelopment: import.meta.env.DEV,
            isProduction: import.meta.env.PROD
        });
        console.log('Connecting to backend URL:', backendUrl);

        this.socket = io(backendUrl, {
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to chat server');
            this.reconnectAttempts = 0;
            const authState = get(authStore);
            console.log('Current auth state:', authState);
            
            if (authState.user) {
                console.log('Joining chat with user:', {
                    id: authState.user.id,
                    username: authState.user.username
                });
                
                this.socket?.emit('join_chat', {
                    userId: authState.user.id,
                    username: authState.user.username
                });
            } else {
                console.error('No user found in auth store');
            }
        });

        this.socket.on('reconnect', (attemptNumber: number) => {
            console.log('Reconnected to chat server, attempt:', attemptNumber);
            const authState = get(authStore);
            if (authState.user) {
                this.socket?.emit('join_chat', {
                    userId: authState.user.id,
                    username: authState.user.username
                });
            }
        });

        this.socket.on('reconnect_error', (error: any) => {
            console.error('Reconnection error:', error);
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                this.errorHandlers.forEach(handler => 
                    handler({ message: 'Connection lost. Please refresh the page.' })
                );
            }
        });

        this.socket.on('recent_messages', (messages: Message[]) => {
            console.log('Received recent messages:', messages.length);
            const processedMessages = messages.map(message => ({
                ...message,
                timestamp: new Date(message.timestamp)
            }));
            this.recentMessagesHandlers.forEach(handler => handler(processedMessages));
        });

        this.socket.on('new_message', (message: Message) => {
            console.log('Received new message:', message);
            const processedMessage = {
                ...message,
                id: message.id || Date.now(),
                timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
            };
            this.messageHandlers.forEach(handler => handler(processedMessage));
        });

        this.socket.on('coin_balance', (data: { coins: number }) => {
            console.log('Received coin balance update:', data);
            this.coinBalanceHandlers.forEach(handler => handler(data));
        });

        this.socket.on('error', (error: { message: string }) => {
            console.error('Socket error received:', error);
            this.errorHandlers.forEach(handler => handler(error));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('Socket connection error:', error);
        });

        this.socket.on('user_typing', () => {
            console.log('Someone is typing...');
            this.typingStartHandlers.forEach(handler => handler());
        });

        this.socket.on('user_stop_typing', () => {
            console.log('Someone stopped typing');
            this.typingStopHandlers.forEach(handler => handler());
        });
    }

    onMessage(handler: (message: Message) => void) {
        this.messageHandlers.push(handler);
        return () => {
            this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
        };
    }

    onRecentMessages(handler: (messages: Message[]) => void) {
        this.recentMessagesHandlers.push(handler);
        return () => {
            this.recentMessagesHandlers = this.recentMessagesHandlers.filter(h => h !== handler);
        };
    }

    onCoinBalance(handler: (data: { coins: number }) => void) {
        this.coinBalanceHandlers.push(handler);
        return () => {
            this.coinBalanceHandlers = this.coinBalanceHandlers.filter(h => h !== handler);
        };
    }

    onError(handler: (error: { message: string }) => void) {
        this.errorHandlers.push(handler);
        return () => {
            this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
        };
    }

    onTypingStart(handler: () => void) {
        this.typingStartHandlers.push(handler);
        return () => {
            this.typingStartHandlers = this.typingStartHandlers.filter(h => h !== handler);
        };
    }

    onTypingStop(handler: () => void) {
        this.typingStopHandlers.push(handler);
        return () => {
            this.typingStopHandlers = this.typingStopHandlers.filter(h => h !== handler);
        };
    }

    emitTyping() {
        if (!this.socket?.connected) return;
        this.socket.emit('typing');
    }

    emitStopTyping() {
        if (!this.socket?.connected) return;
        this.socket.emit('stop_typing');
    }

    sendMessage(messageData: Partial<Message>) {
        if (!this.socket?.connected) {
            console.error('Socket not connected');
            return;
        }
        console.log('Sending message:', messageData);
        this.socket.emit('send_message', messageData);
    }

    disconnect() {
        if (this.socket) {
            console.log('Disconnecting socket');
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService(); 