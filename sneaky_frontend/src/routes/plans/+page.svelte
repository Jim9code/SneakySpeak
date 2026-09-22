<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { env } from '$env/dynamic/public';
  import { authService } from '$lib/services/authService';
  
  const PUBLIC_PAYSTACK_KEY = env.PUBLIC_PAYSTACK_KEY || '';
  
  export let data: PageData;

  const COIN_PACKAGES = [
    { coins: 20, price: 200, description: 'Basic Pack', savings: '0%' },
    { coins: 50, price: 400, description: 'Popular Pack', savings: '20%' },
    { coins: 100, price: 700, description: 'Premium Pack', savings: '30%' }
  ];

  let PaystackPop: any;
  let loading = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  let paymentLogs: string[] = [];

  function addLog(message: string) {
    console.log(message);
    paymentLogs = [...paymentLogs, message];
  }

  onMount(async () => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      PaystackPop = (window as any).PaystackPop;
    };
  });

  async function verifyPayment(reference: string, coins: number) {
    try {
      loading = true;
      error = null;
      successMessage = null;
      paymentLogs = [];

      // Get the current auth state
      const auth = $authStore;
      addLog(`Initial auth state: ${JSON.stringify({
        isAuthenticated: auth.isAuthenticated,
        hasToken: !!auth.token,
        hasUser: !!auth.user,
        userId: auth?.user?.id,
        coins
      }, null, 2)}`);
      
      if (!auth.isAuthenticated || !auth.user) {
        throw new Error('Authentication required - not authenticated');
      }

      // Try to refresh token if it's missing
      if (!auth.token) {
        addLog('No token found, attempting to refresh token...');
        try {
          await authService.refreshToken();
          const newAuth = $authStore;
          addLog(`Auth state after refresh: ${JSON.stringify({
            isAuthenticated: newAuth.isAuthenticated,
            hasToken: !!newAuth.token,
            hasUser: !!newAuth.user,
            userId: newAuth?.user?.id
          }, null, 2)}`);

          if (!newAuth.token) {
            addLog('Token refresh failed: no token in refreshed state');
            await goto('/login');
            throw new Error('Please log in again to continue');
          }
        } catch (refreshError: any) {
          addLog(`Token refresh failed: ${refreshError.message}`);
          await goto('/login');
          throw new Error('Please log in again to continue');
        }
      }

      const url = `${import.meta.env.VITE_API_URL}/payment/verify/${reference}`;
      addLog(`Making request to: ${url}`);
      addLog(`Request payload: ${JSON.stringify({ coins })}`);

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${$authStore.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ coins })
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);

      const result = await response.json();
      addLog(`Response data: ${JSON.stringify(result, null, 2)}`);

      if (!response.ok) {
        if (response.status === 401) {
          addLog('Got 401, authentication failed');
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(result.message || 'Payment verification failed');
      }

      if (result.success) {
        addLog(`Payment successful! New balance: ${result.coins} coins`);
        // Update coin balance using the store's method
        authStore.updateCoins(result.coins);

        // Show clean success message without debug logs
        successMessage = `Payment successful! ${result.message}`;
      } else {
        error = result.message || 'Payment verification failed';
      }
    } catch (err: any) {
      const errorDetails = {
        message: err.message,
        stack: err.stack,
        error: err
      };
      addLog(`Error: ${JSON.stringify(errorDetails, null, 2)}`);
      error = err.message || 'Failed to verify payment. Please contact support.';
    } finally {
      loading = false;
    }
  }

  async function retryVerification(reference: string, coins: number, maxRetries = 3) {
    // Initial delay to allow Paystack to process
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        addLog(`Attempt ${i + 1} of ${maxRetries} to verify payment...`);
        await verifyPayment(reference, coins);
        addLog('Verification successful!');
        return; // If successful, exit the function
      } catch (err) {
        if (i === maxRetries - 1) {
          addLog('All verification attempts failed');
          throw err; // Throw on last retry
        }
        addLog(`Retry ${i + 1} failed, waiting before next attempt...`);
        // Wait longer between each retry (15s, 20s, 25s)
        await new Promise(resolve => setTimeout(resolve, 15000 + (i * 5000)));
      }
    }
  }

  function handlePurchase(package_: typeof COIN_PACKAGES[0]) {
    if (loading) return;

    const auth = $authStore;
    if (!auth.isAuthenticated || !auth.user) {
      error = 'Please log in to purchase coins';
      return;
    }

    // Generate a unique reference using only alphanumeric characters
    const timestamp = Date.now();
    const userId = auth.user.id;
    const random = Math.random().toString(36).substring(2, 8);
    const reference = `PAY${timestamp}${userId}${random}`;
    addLog(`Generated payment reference: ${reference}`);

    const handler = PaystackPop.setup({
      key: PUBLIC_PAYSTACK_KEY,
      email: auth.user.email,
      amount: package_.price * 100, // Convert to kobo
      currency: 'NGN',
      ref: reference,
      metadata: {
        coins: package_.coins,
        user_id: auth.user.id,
        custom_fields: [
          {
            display_name: "Coins Amount",
            variable_name: "coins_amount",
            value: package_.coins
          }
        ]
      },
      callback: function(response: { reference: string; status: string }) {
        addLog(`Paystack callback received: ${JSON.stringify(response, null, 2)}`);
        
        if (response.status !== 'success') {
          error = 'Payment was not successful';
          return;
        }
        
        // Verify that the reference matches
        if (response.reference !== reference) {
          addLog(`Reference mismatch! Expected: ${reference}, Got: ${response.reference}`);
          error = 'Payment verification failed: reference mismatch';
          return;
        }
        
        // Start verification process
        retryVerification(response.reference, package_.coins).catch((err) => {
          error = err.message || 'Failed to verify payment after multiple attempts';
        });
      },
      onClose: function() {
        addLog('Payment dialog closed');
        if (loading) {
          error = 'Please wait while we verify your payment';
        }
      }
    });

    addLog(`Opening Paystack payment frame for ${package_.coins} coins (₦${package_.price})`);
    handler.openIframe();
  }

  function goToChat() {
    goto('/chat');
  }
</script>

<div class="min-h-screen bg-black text-white overflow-y-auto">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center">
      <div class="inline-flex items-center justify-center p-3 bg-neutral-950 rounded-2xl border border-neutral-800 mb-4 shadow-xl">
        <img src="/logo.png" alt="Ahnonimoz" class="w-12 h-12 rounded-xl object-cover" />
      </div>
      <h2 class="text-3xl font-extrabold sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-neutral-100 to-purple-400">
        Get Stealth Coins
      </h2>
      <p class="mt-3 text-base sm:text-lg text-neutral-400 max-w-xl mx-auto">
        Fuel your anonymity. Purchase coins to send encrypted anonymous messages and stealth memes.
      </p>

      <div class="mt-4 flex justify-center">
        <button 
          on:click={goToChat}
          class="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
        >
          ← Return to Chat
        </button>
      </div>

      {#if error}
        <div class="mt-6 max-w-md mx-auto p-4 bg-red-950/60 border border-red-800/60 rounded-xl text-left">
          <p class="text-sm text-red-200">{error}</p>
          {#if error.includes('Authentication')}
            <button
              class="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              on:click={() => goto('/login')}
            >
              Go to Login
            </button>
          {/if}
        </div>
      {/if}

      {#if successMessage}
        <div class="mt-6 max-w-md mx-auto p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-center">
          <h3 class="text-base font-semibold text-emerald-300 mb-1">Payment Successful!</h3>
          <p class="text-sm text-emerald-200">{successMessage}</p>
          <div class="mt-4 flex justify-center space-x-3">
            <button
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors"
              on:click={() => goto('/chat')}
            >
              Go to Chat
            </button>
            <button
              class="px-4 py-2 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
              on:click={() => successMessage = null}
            >
              Close
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="mt-10 space-y-4 sm:mt-14 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-3">
      {#each COIN_PACKAGES as package_}
        <div class="bg-neutral-950 border border-neutral-800/90 rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.7)] divide-y divide-neutral-850 hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between">
          <div class="p-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-white">{package_.description}</h3>
              {#if package_.savings !== '0%'}
                <span class="px-2.5 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 rounded-full">
                  Save {package_.savings}
                </span>
              {/if}
            </div>
            <p class="mt-2 text-sm text-neutral-400">Get {package_.coins} stealth coins</p>
            <p class="mt-6">
              <span class="text-4xl font-extrabold text-white">₦{package_.price}</span>
            </p>
            <button
              type="button"
              on:click={() => handlePurchase(package_)}
              disabled={loading}
              class="mt-6 block w-full bg-purple-600 hover:bg-purple-500 border border-purple-500/40 rounded-xl py-2.5 text-sm font-semibold text-white text-center shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? 'Processing...' : `Get ${package_.coins} Coins`}
            </button>
          </div>
          <div class="px-6 pt-5 pb-6 bg-neutral-950/50 rounded-b-2xl">
            <h4 class="text-xs uppercase tracking-wider font-semibold text-neutral-400">What's included</h4>
            <ul class="mt-4 space-y-3">
              <li class="flex items-center space-x-3 text-sm text-neutral-300">
                <svg class="flex-shrink-0 h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span>{Math.floor(package_.coins/2)} anonymous text messages</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-neutral-300">
                <svg class="flex-shrink-0 h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span>{Math.floor(package_.coins/4)} anonymous memes</span>
              </li>
            </ul>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  /* Add smooth scrolling to the page */
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Ensure proper overflow handling */
  :global(body) {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
</style> 