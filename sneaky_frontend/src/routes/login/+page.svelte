<script lang="ts">
    import { goto } from '$app/navigation';
    import { authService } from '$lib/services/authService';
    import { authStore } from '$lib/stores/authStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let email = '';
    let verificationCode = '';
    let isVerificationStep = false;
    let error = '';
    let isLoading = false;
    let successMessage = '';

    onMount(() => {
        console.log('Login page mounted, auth state:', $authStore);
        // If already authenticated, redirect to chat
        if ($authStore.isAuthenticated && browser) {
            goto('/chat', { replaceState: true });
        }
    });

    // Watch for authentication state changes
    $: if ($authStore.isAuthenticated && browser) {
        console.log('User authenticated, redirecting to chat...');
        window.location.href = '/chat';
    }

    // Format verification code to only allow numbers
    function handleCodeInput(event: Event) {
        const input = event.target as HTMLInputElement;
        // Remove any non-digit characters
        input.value = input.value.replace(/\D/g, '');
        // Limit to 6 digits
        if (input.value.length > 6) {
            input.value = input.value.slice(0, 6);
        }
        verificationCode = input.value;
    }

    async function handleSubmit() {
        error = '';
        successMessage = '';
        isLoading = true;

        try {
            if (!isVerificationStep) {
                await authService.initiateLogin(email);
                isVerificationStep = true;
                successMessage = 'Verification code sent to your email!';
            } else {
                if (verificationCode.length !== 6) {
                    throw new Error('Please enter a 6-digit verification code');
                }
                console.log('Submitting verification code...');
                await authService.verifyCode(email, verificationCode);
                console.log('Verification successful, redirecting...');
                // Force a hard redirect to ensure a clean state
                window.location.href = '/chat';
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'An error occurred';
            console.error('Login error:', e);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4 relative overflow-hidden">
    <!-- Animated background elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute inset-0 bg-grid opacity-5"></div>
        {#each Array(5) as _, i}
            <div
                class="absolute rounded-full bg-gradient-to-r from-gray-700/30 to-gray-600/30 blur-2xl"
                style="
                    width: {200 + i * 50}px;
                    height: {200 + i * 50}px;
                    left: {Math.random() * 100}%;
                    top: {Math.random() * 100}%;
                    animation: float-{i} {15 + i * 2}s infinite ease-in-out;
                "
            />
        {/each}
    </div>

    <div class="max-w-md w-full space-y-6 p-6 sm:p-8 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-800/50 shadow-[0_0_15px_rgba(0,0,0,0.3)] relative z-10">
        <div>
            <h2 class="mt-4 text-center text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-200">
                Welcome to SneakChat
            </h2>
            <p class="mt-2 text-center text-sm sm:text-base text-gray-400">
                {isVerificationStep ? 'Enter the verification code sent to your email' : 'Sign in with your school email'}
            </p>
        </div>

        <form class="mt-6 space-y-4 sm:space-y-6" on:submit|preventDefault={handleSubmit}>
            {#if error}
                <div class="rounded-md bg-red-900/50 border border-red-500/50 p-3 sm:p-4">
                    <div class="text-xs sm:text-sm text-red-200">
                        {error}
                    </div>
                </div>
            {/if}

            {#if successMessage}
                <div class="rounded-md bg-green-900/50 border border-green-500/50 p-3 sm:p-4">
                    <div class="text-xs sm:text-sm text-green-200">
                        {successMessage}
                    </div>
                </div>
            {/if}

            <div class="rounded-md shadow-sm -space-y-px">
                {#if !isVerificationStep}
                    <div>
                        <label for="email" class="sr-only">School Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            bind:value={email}
                            class="appearance-none rounded-lg relative block w-full px-3 py-2 sm:py-3 bg-gray-800/50 border border-gray-700/50 placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:z-10 text-sm sm:text-base transition-all duration-200"
                            placeholder="your.name@school.edu"
                            disabled={isLoading}
                        />
                    </div>
                {:else}
                    <div>
                        <label for="code" class="sr-only">Verification Code</label>
                        <input
                            id="code"
                            name="code"
                            type="text"
                            inputmode="numeric"
                            required
                            minlength="6"
                            maxlength="6"
                            bind:value={verificationCode}
                            on:input={handleCodeInput}
                            class="appearance-none rounded-lg relative block w-full px-3 py-2 sm:py-3 bg-gray-800/50 border border-gray-700/50 placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:z-10 text-center tracking-widest font-mono text-lg sm:text-xl transition-all duration-200"
                            placeholder="000000"
                            disabled={isLoading}
                        />
                        <p class="mt-2 text-xs sm:text-sm text-gray-400 text-center">
                            Enter the 6-digit code sent to your email. Check your inbox and spam folder if you don't see it.
                        </p>
                    </div>
                {/if}
            </div>

            <div>
                <button
                    type="submit"
                    class="group relative w-full flex justify-center py-2 sm:py-3 px-4 border-2 border-indigo-500/50 text-sm sm:text-base font-medium rounded-lg text-white bg-indigo-600/20 hover:bg-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 focus:ring-offset-gray-900 disabled:opacity-50 transition-all duration-200 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    {/if}
                    {isVerificationStep ? 'Verify Code' : 'Continue with Email'}
                </button>
            </div>

            {#if isVerificationStep}
                <div class="text-center">
                    <button
                        type="button"
                        class="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline transition-colors"
                        on:click={() => {
                            isVerificationStep = false;
                            verificationCode = '';
                            error = '';
                            successMessage = '';
                        }}
                    >
                        ← Back to Email
                    </button>
                </div>
            {/if}
        </form>
    </div>
</div>

<style>
    .bg-grid {
        background-image: 
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 20px 20px;
    }

    /* Floating animation for background elements */
    @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
    @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1.1); } 50% { transform: translate(-20px, 20px) scale(1); } }
    @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(0.9); } 50% { transform: translate(40px, 20px) scale(1); } }
    @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1.2); } 50% { transform: translate(-30px, -40px) scale(1.1); } }
    @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(0.8); } 50% { transform: translate(20px, 30px) scale(0.9); } }
</style> 