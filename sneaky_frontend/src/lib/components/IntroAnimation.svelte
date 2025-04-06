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
  <div class="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
    <!-- Animated grid background -->
    <div class="absolute inset-0 bg-grid opacity-5"></div>
    
    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
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

    <div class="text-center relative z-10">
      {#if showMascot}
        <div 
          in:fly={{ y: 50, duration: 800, easing: (t) => --t * t * t + 1 }}
          class="text-8xl mb-6 transform hover:scale-110 transition-transform filter drop-shadow-glow"
        >
          🤫
        </div>
      {/if}

      {#if showLogo}
        <h1 
          in:fly={{ y: -30, duration: 600 }}
          class="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-200 mb-4 tracking-tight filter drop-shadow-glow"
        >
          SneakChat
        </h1>
      {/if}

      {#if showTagline}
        <p 
          in:fade={{ duration: 400 }}
          class="text-lg text-gray-300 font-medium relative"
        >
          Chat freely, stay sneaky!
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .bg-grid {
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
  @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1.1); } 50% { transform: translate(-20px, 20px) scale(1); } }
  @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(0.9); } 50% { transform: translate(40px, 20px) scale(1); } }
  @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1.2); } 50% { transform: translate(-30px, -40px) scale(1.1); } }
  @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(0.8); } 50% { transform: translate(20px, 30px) scale(0.9); } }

  .drop-shadow-glow {
    filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.3));
  }

  :global(body) {
    overflow: hidden;
  }
</style>