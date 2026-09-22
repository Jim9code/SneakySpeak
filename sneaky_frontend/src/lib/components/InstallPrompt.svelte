<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  let deferredPrompt: any = null;
  let showPrompt = false;
  let isIOS = false;
  let showIOSInstructions = false;
  let isStandalone = false;

  onMount(() => {
    // Check if app is already running in standalone (installed) mode
    isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if dismissed recently
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    isIOS = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;

    // Handle Chrome / Android PWA prompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // Show prompt after a short delay for better UX
      setTimeout(() => {
        showPrompt = true;
      }, 2000);
    });

    // If iOS Safari and not standalone, show prompt after 3s
    if (isIOS && !isStandalone) {
      setTimeout(() => {
        showPrompt = true;
      }, 3000);
    }
  });

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showPrompt = false;
      }
      deferredPrompt = null;
    } else if (isIOS) {
      showIOSInstructions = true;
    }
  }

  function handleDismiss() {
    showPrompt = false;
    showIOSInstructions = false;
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  }
</script>

{#if showPrompt && !isStandalone}
  <div 
    class="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 max-w-sm z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-3.5 shadow-2xl ring-1 ring-white/10"
    in:fly={{ y: 50, duration: 400 }}
    out:fade={{ duration: 200 }}
  >
    <div class="flex items-center gap-3">
      <img 
        src="/logo.png" 
        alt="SneakySpeak App" 
        class="w-12 h-12 rounded-xl shadow-md border border-indigo-500/40 object-cover flex-shrink-0"
      />
      
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-white truncate">Install SneakySpeak</h4>
        <p class="text-xs text-gray-300 leading-tight">Get the full app experience on your phone</p>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button
          on:click={handleInstall}
          class="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install
        </button>

        <button
          on:click={handleDismiss}
          class="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- iOS Safari Manual Instructions Modal -->
{#if showIOSInstructions}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
    <div 
      class="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 max-w-sm w-full text-white shadow-2xl"
      in:fly={{ y: 50, duration: 300 }}
    >
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-2">
          <img src="/logo.png" alt="SneakySpeak" class="w-8 h-8 rounded-lg" />
          <h3 class="font-bold text-base">Install on iPhone / iPad</h3>
        </div>
        <button on:click={() => showIOSInstructions = false} class="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div class="space-y-3 text-sm text-gray-300 mb-5">
        <div class="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
          <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
          <p>Tap the <strong>Share</strong> button <svg class="inline-block w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in Safari's toolbar.</p>
        </div>
        <div class="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
          <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
          <p>Scroll down and select <strong>"Add to Home Screen" ➕</strong>.</p>
        </div>
      </div>

      <button
        on:click={() => showIOSInstructions = false}
        class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-center text-sm transition-colors"
      >
        Got it!
      </button>
    </div>
  </div>
{/if}
