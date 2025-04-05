<script lang="ts">
    import { authStore } from '$lib/stores/authStore';
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';

    export let currentUsername: string;
    const dispatch = createEventDispatcher();
    const COINS_REQUIRED = 70;

    let username = currentUsername;
    let error = '';
    let loading = false;

    $: canAfford = ($authStore.user?.coins ?? 0) >= COINS_REQUIRED;

    async function handleSubmit() {
        if (!username || username.length < 3) {
            error = 'Username must be at least 3 characters long';
            return;
        }

        if (!canAfford) {
            error = `Insufficient coins. Username change requires ${COINS_REQUIRED} coins. You have ${$authStore.user?.coins ?? 0} coins.`;
            return;
        }

        loading = true;
        error = '';

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/username`, {
                method: 'PUT',
                credentials: 'include', // Add this to include cookies
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${$authStore.token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update username');
            }

            // Update the auth store with new user data
            authStore.updateUser(data);
            dispatch('close');
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function handleClose() {
        dispatch('close');
    }
</script>

<div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 m-4">
        <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
            Update Username
        </h3>

        <form on:submit|preventDefault={handleSubmit} class="space-y-3 sm:space-y-4">
            {#if error}
                <div class="rounded-md bg-red-50 p-2 sm:p-3">
                    <p class="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
            {/if}

            <div>
                <label for="username" class="block text-xs sm:text-sm font-medium text-gray-700">
                    New Username
                </label>
                <input
                    type="text"
                    id="username"
                    bind:value={username}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm"
                    placeholder="Enter new username"
                    disabled={loading}
                />
            </div>

            <div class="flex justify-end gap-2 sm:gap-3">
                <button
                    type="button"
                    class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-orange-500 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    on:click={() => goto('/plans')}
                    disabled={loading}
                >
                    Add Coins
                </button>
                <button
                    type="button"
                    class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    on:click={handleClose}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    disabled={loading}
                >
                    {#if loading}
                        <svg class="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    {/if}
                    Update Username
                </button>
            </div>
        </form>
    </div>
</div> 