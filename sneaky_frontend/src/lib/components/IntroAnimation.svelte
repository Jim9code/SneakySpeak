<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';

  export let onComplete: () => void;
  let mounted = false;
  let showLogo = false;
  let showTagline = false;

  onMount(() => {
    mounted = true;
    // Fast, seamless sequence picking up right where phone launch screen left off
    setTimeout(() => { showLogo = true; }, 150);
    setTimeout(() => { showTagline = true; }, 450);
    setTimeout(() => { onComplete(); }, 1600); // Snappy 1.6s total transition
  });
</script>

{#if mounted}
  <div 
    class="fixed inset-0 bg-black flex items-center justify-center overflow-hidden z-50"
    out:fade={{ duration: 300 }}
  >
    <!-- Subtle grid background -->
    <div class="absolute inset-0 bg-grid opacity-10"></div>
    
    <!-- Ambient glow rings matching the logo -->
    <div class="absolute w-72 h-72 rounded-full bg-purple-600/15 blur-3xl pointer-events-none animate-pulse"></div>

    <div class="text-center relative z-10 px-4">
      <!-- Centered stealth logo picking up directly from OS splash center -->
      <div 
        in:scale={{ start: 0.9, duration: 400 }}
        class="mb-5 flex justify-center"
      >
        <img 
          src="/logo.png" 
          alt="Ahnonimoz Logo" 
          class="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-2xl border border-purple-500/40 drop-shadow-glow object-cover" 
        />
      </div>

      {#if showLogo}
        <h1 
          in:fly={{ y: 20, duration: 400 }}
          class="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-neutral-100 to-purple-400 mb-2 tracking-tight filter drop-shadow-glow"
        >
          Ahnonimoz
        </h1>
      {/if}

      {#if showTagline}
        <p 
          in:fade={{ duration: 300 }}
          class="text-sm sm:text-base text-neutral-400 font-medium tracking-wide"
        >
          Speak freely, stay anonymous.
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .bg-grid {
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .drop-shadow-glow {
    filter: drop-shadow(0 0 25px rgba(168, 85, 247, 0.4));
  }

  :global(body) {
    overflow: hidden;
  }
</style>