<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let onComplete: () => void;
  let mounted = false;
  let showLogo = false;
  let showTagline = false;
  let showMascot = false;

  onMount(() => {
    mounted = true;
    // Sequence the animations
    setTimeout(() => { showMascot = true; }, 300);
    setTimeout(() => { showLogo = true; }, 800);
    setTimeout(() => { showTagline = true; }, 1300);
    setTimeout(() => { onComplete(); }, 3000); // Complete after 3 seconds
  });
</script>

{#if mounted}
  <div class="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
    <div class="text-center">
      {#if showMascot}
        <div 
          in:fly={{ y: 50, duration: 800, easing: (t) => --t * t * t + 1 }}
          class="text-8xl mb-6 transform hover:scale-110 transition-transform"
        >
          🤫
        </div>
      {/if}

      {#if showLogo}
        <h1 
          in:fly={{ y: -30, duration: 600 }}
          class="text-5xl font-bold text-white mb-4 tracking-tight"
        >
          SneakySpeak
        </h1>
      {/if}

      {#if showTagline}
        <p 
          in:fade={{ duration: 400 }}
          class="text-lg text-white/90 font-medium"
        >
          Chat freely, stay sneaky!
        </p>
      {/if}
    </div>

    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      {#each Array(5) as _, i}
        <div
          class="absolute w-64 h-64 rounded-full bg-white/5"
          style="
            left: {Math.random() * 100}%;
            top: {Math.random() * 100}%;
            animation: float {8 + i * 2}s infinite ease-in-out;
          "
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  @keyframes float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(30px, -30px) scale(1.1);
    }
  }
</style>