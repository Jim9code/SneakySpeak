<!-- Login Page -->
<script lang="ts">
  import { goto } from '$app/navigation';
  
  let email = '';
  let error = '';

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    
    // Basic email validation for school domain
    if (!email.endsWith('.edu')) {
      error = 'Please use a valid school email address (.edu)';
      return;
    }

    // For now, just redirect to chat (we'll add actual auth later)
    goto('/chat');
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center">
  <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">SneakySpeak</h1>
      <p class="text-gray-600 mt-2">Connect with your classmates</p>
    </div>

    <form on:submit={handleLogin} class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">School Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="your.email@school.edu"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
        {#if error}
          <p class="mt-2 text-sm text-red-600">{error}</p>
        {/if}
      </div>

      <button
        type="submit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Join Chat
      </button>
    </form>
  </div>
</div>

<style>
  /* Add any custom styles here */
</style>
