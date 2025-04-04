<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { PUBLIC_PAYSTACK_KEY } from '$env/static/public';
  import { authService } from '$lib/services/authService';
  
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

  function handlePurchase(package_: typeof COIN_PACKAGES[0]) {
    if (loading) return;

    const auth = $authStore;
    if (!auth.isAuthenticated || !auth.user) {
      error = 'Please log in to purchase coins';
      return;
    }

    const handler = PaystackPop.setup({
      key: PUBLIC_PAYSTACK_KEY,
      email: auth.user.email,
      amount: package_.price * 100, // Convert to kobo
      currency: 'NGN',
      ref: `coins_${Date.now()}_${auth.user.id}`,
      metadata: {
        coins: package_.coins,
        user_id: auth.user.id
      },
      callback: function(response: any) {
        addLog(`Paystack callback: ${JSON.stringify(response, null, 2)}`);
        verifyPayment(response.reference, package_.coins);
      },
      onClose: function() {
        if (loading) {
          error = 'Please wait while we verify your payment';
        }
      }
    });
    handler.openIframe();
  }

  function goToChat() {
    goto('/chat');
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
  <div class="text-center">
    <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">
      Get More Coins
    </h2>
    <p class="mt-4 text-lg text-gray-600">
      Purchase coins to send anonymous messages and memes
    </p>
    {#if error}
      <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-600">{error}</p>
        {#if error.includes('Authentication')}
          <button
            class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            on:click={() => goto('/login')}
          >
            Go to Login
          </button>
        {/if}
      </div>
    {/if}
    {#if successMessage}
      <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <h3 class="text-lg font-medium text-green-800 mb-2">Success!</h3>
        <p class="text-green-700">{successMessage}</p>
        <div class="mt-4 flex justify-center space-x-4">
          <button
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            on:click={() => goto('/chat')}
          >
            Go to Chat
          </button>
          <button
            class="px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            on:click={() => successMessage = null}
          >
            Close
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-3">
    {#each COIN_PACKAGES as package_}
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900">{package_.description}</h3>
          <p class="mt-4 text-sm text-gray-500">Get {package_.coins} coins</p>
          <p class="mt-8">
            <span class="text-4xl font-extrabold text-gray-900">₦{package_.price}</span>
          </p>
          {#if package_.savings !== '0%'}
            <p class="mt-2 text-sm text-green-600">Save {package_.savings}</p>
          {/if}
          <button
            type="button"
            on:click={() => handlePurchase(package_)}
            disabled={loading}
            class="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Purchase'}
          </button>
        </div>
        <div class="px-6 pt-6 pb-8">
          <h4 class="text-sm font-medium text-gray-900">What's included</h4>
          <ul class="mt-6 space-y-4">
            <li class="flex space-x-3">
              <svg class="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm text-gray-500">Send {Math.floor(package_.coins/2)} anonymous text messages</span>
            </li>
            <li class="flex space-x-3">
              <svg class="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm text-gray-500">Send {Math.floor(package_.coins/4)} anonymous memes</span>
            </li>
          </ul>
        </div>
      </div>
    {/each}
  </div>
</div> 