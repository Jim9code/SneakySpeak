import { authStore } from '../stores/authStore';
import { get } from 'svelte/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
    message: string;
}

interface User {
    id: number;
    email: string;
    username: string;
    school_domain: string;
    coins: number;
}

interface VerifyResponse {
    user: User;
    token: string;
}

class AuthService {
    constructor() {
        // Log the API URL being used
        console.log('Using API URL:', API_URL);
    }

    async initiateLogin(email: string): Promise<LoginResponse> {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to initiate login');
        }

        return response.json();
    }

    async verifyCode(email: string, code: string): Promise<void> {
        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, code }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to verify code');
        }

        const data: VerifyResponse = await response.json();
        console.log('Verification response:', data);
        
        if (!data.token) {
            console.error('No token received in verification response');
            throw new Error('Authentication failed - no token received');
        }

        console.log('Setting user with token in auth store');
        authStore.setUser(data.user, data.token);
        
        // Verify the token was stored
        const unsubscribe = authStore.subscribe(state => {
            console.log('Current auth state:', {
                isAuthenticated: state.isAuthenticated,
                hasToken: !!state.token,
                hasUser: !!state.user
            });
        });
        unsubscribe();
    }

    async getProfile(): Promise<void> {
        const auth = get(authStore);
        const token = auth.token;

        if (!token) {
            throw new Error('No authentication token available');
        }

        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
                authStore.logout();
            }
            const error = await response.json();
            throw new Error(error.message || 'Failed to get profile');
        }

        const user = await response.json();
        authStore.updateUser(user);
    }

    async logout(): Promise<void> {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } finally {
            authStore.logout();
        }
    }

    async updateUsername(newUsername: string): Promise<void> {
        const response = await fetch(`${API_URL}/auth/username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: newUsername }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update username');
        }

        const user = await response.json();
        authStore.updateUser(user);
    }

    async refreshToken(): Promise<void> {
        try {
            // Try to verify the token using the cookie
            const response = await fetch(`${API_URL}/auth/verify-token`, {
                method: 'POST',
                credentials: 'include', // Important: include cookies
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Token refresh failed:', {
                    status: response.status,
                    statusText: response.statusText
                });
                // Clear auth state and throw error
                authStore.logout();
                throw new Error('Session expired. Please log in again.');
            }

            const data = await response.json();
            if (!data.user || !data.token) {
                console.error('Invalid response data:', data);
                authStore.logout();
                throw new Error('Invalid response from server');
            }

            console.log('Successfully refreshed token');
            authStore.setUser(data.user, data.token);
        } catch (error) {
            console.error('Failed to refresh token:', error);
            // Clear the auth state since refresh failed
            authStore.logout();
            throw error;
        }
    }
}

export const authService = new AuthService(); 