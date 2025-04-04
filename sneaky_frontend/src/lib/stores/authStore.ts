import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
    id: number;
    email: string;
    username: string;
    school_domain: string;
    coins: number;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    token: string | null;
}

const STORAGE_KEY = 'auth_state';

// Load initial state from localStorage if available
const loadInitialState = (): AuthState => {
    if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored auth state:', e);
            }
        }
    }
    return {
        user: null,
        isAuthenticated: false,
        token: null
    };
};

const createAuthStore = () => {
    const { subscribe, set, update } = writable<AuthState>(loadInitialState());

    // Save state to localStorage whenever it changes
    const saveState = (state: AuthState) => {
        if (browser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    };

    return {
        subscribe,
        setUser: (user: User | null, token: string | null = null) => {
            console.log('Setting user in auth store:', user);
            const state = { 
                user, 
                isAuthenticated: !!user,
                token
            };
            set(state);
            saveState(state);
        },
        logout: () => {
            console.log('Logging out user');
            const state = { 
                user: null, 
                isAuthenticated: false,
                token: null
            };
            set(state);
            if (browser) {
                localStorage.removeItem(STORAGE_KEY);
            }
        },
        updateUser: (user: User) => {
            console.log('Updating user in auth store:', user);
            update(state => {
                const newState = { 
                    ...state, 
                    user,
                    isAuthenticated: true,
                    token: state.token
                };
                saveState(newState);
                return newState;
            });
        },
        updateCoins: (coins: number) => {
            console.log('Updating user coins:', coins);
            update(state => {
                if (!state.user) return state;
                const newState = {
                    ...state,
                    user: {
                        ...state.user,
                        coins
                    },
                    token: state.token
                };
                saveState(newState);
                return newState;
            });
        }
    };
};

export const authStore = createAuthStore(); 