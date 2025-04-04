import { authStore } from '$lib/stores/authStore';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
    // Subscribe to the auth store
    let authState: { isAuthenticated: boolean; user: any } | undefined;
    
    // Only run this on the client side
    if (typeof window !== 'undefined') {
        const unsubscribe = authStore.subscribe(state => {
            authState = state;
        });
        unsubscribe();
    }

    return {
        isAuthenticated: authState?.isAuthenticated ?? false,
        user: authState?.user ?? null
    };
};

// Make the layout reactive to auth store changes
export const ssr = false; // Disable SSR for auth-dependent routes 