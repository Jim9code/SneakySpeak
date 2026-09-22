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

<div class="min-h-screen bg-black flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-neutral-950 rounded-2xl border border-neutral-800/80 shadow-2xl p-8">
    <div class="text-center mb-8">
      <img src="/logo.png" alt="Ahnonimoz" class="w-16 h-16 mx-auto rounded-2xl border border-purple-500/40 shadow-lg object-cover mb-3" />
      <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-neutral-100 to-purple-400">Ahnonimoz</h1>
      <p class="text-neutral-400 mt-2 text-sm">Connect with your classmates anonymously</p>
    </div>

    <form on:submit={handleLogin} class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-neutral-300">School Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="your.email@school.edu"
          class="mt-1 block w-full rounded-xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 shadow-sm focus:border-purple-500 focus:ring-purple-500/50 sm:text-sm px-3.5 py-2.5"
          required
        />
        {#if error}
          <p class="mt-2 text-sm text-red-400">{error}</p>
        {/if}
      </div>

      <button
        type="submit"
        class="w-full flex justify-center py-2.5 px-4 border border-purple-500/40 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.25)] text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-black transition-all active:scale-[0.98]"
      >
        Join Chat
      </button>
    </form>
  </div>
</div>

<style>
  /* Add any custom styles here */
</style>
