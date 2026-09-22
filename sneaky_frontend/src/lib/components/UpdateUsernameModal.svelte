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

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
    <div class="bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800/90 max-w-md w-full p-5 sm:p-6 m-4 text-white">
        <div class="flex items-center gap-2.5 mb-4">
            <span class="text-xl">🤫</span>
            <h3 class="text-base sm:text-lg font-bold text-white">
                Update Codename
            </h3>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            {#if error}
                <div class="rounded-xl bg-red-950/60 border border-red-800/60 p-3">
                    <p class="text-xs sm:text-sm text-red-200">{error}</p>
                </div>
            {/if}

            <div>
                <label for="username" class="block text-xs sm:text-sm font-medium text-neutral-300">
                    New Codename
                </label>
                <input
                    type="text"
                    id="username"
                    bind:value={username}
                    class="mt-1.5 block w-full rounded-xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 shadow-inner focus:border-purple-500 focus:ring-purple-500/50 text-xs sm:text-sm px-3.5 py-2.5"
                    placeholder="Enter new codename"
                    disabled={loading}
                />
                <p class="mt-1.5 text-xs text-neutral-400">
                    Changing your codename costs <strong class="text-amber-400">{COINS_REQUIRED} coins</strong>.
                </p>
            </div>

            <div class="flex justify-end gap-2 sm:gap-3 pt-2">
                <button
                    type="button"
                    class="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 border border-amber-500/40 rounded-xl shadow-md transition-colors"
                    on:click={() => goto('/plans')}
                    disabled={loading}
                >
                  + Add Coins
                </button>
                <button
                    type="button"
                    class="px-3.5 py-2 text-xs sm:text-sm font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-850 hover:text-white transition-colors"
                    on:click={handleClose}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 border border-purple-500/40 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50 transition-all active:scale-95"
                    disabled={loading}
                >
                    {#if loading}
                        <svg class="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    {/if}
                    Save Codename
                </button>
            </div>
        </form>
    </div>
</div> 