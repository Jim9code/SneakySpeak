<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import MessageList from '$lib/components/MessageList.svelte';
  import MessageInput from '$lib/components/MessageInput.svelte';
  import IntroAnimation from '$lib/components/IntroAnimation.svelte';
  import UpdateUsernameModal from '$lib/components/UpdateUsernameModal.svelte';
  import { authStore } from '$lib/stores/authStore';
  import { authService } from '$lib/services/authService';
  import { socketService } from '$lib/services/socketService';
  import { uploadService } from '$lib/services/uploadService';
  
  interface Message {
    id: number;
    text: string;
    sender: string;
    timestamp: Date;
    isAnonymous: boolean;
    type?: 'text' | 'meme';
    imageUrl?: string;
    caption?: string;
  }

  interface MessageEvent {
    detail: string;
  }

  interface ImageEvent {
    detail: { file: File; caption?: string };
  }

  let messages: Message[] = [];
  let isAnonymous = false;
  let showIntro = true;
  let mounted = false;
  let showUsernameModal = false;

  // Access the authenticated user
  $: user = $authStore.user;
  $: coins = user?.coins ?? 0;

  onMount(() => {
    mounted = true;
    // Redirect to login if not authenticated
    if (!$authStore.isAuthenticated) {
      goto('/login', { replaceState: true });
      return;
    }

    // Initialize socket connection
    socketService.connect();

    // Subscribe to recent messages
    const unsubscribeRecent = socketService.onRecentMessages((recentMessages) => {
      messages = recentMessages;
      // Auto-scroll to bottom after loading recent messages
      setTimeout(() => {
        const messageList = document.querySelector('.overflow-y-auto');
        if (messageList) {
          messageList.scrollTop = messageList.scrollHeight;
        }
      }, 0);
    });

    // Subscribe to new messages
    const unsubscribeNew = socketService.onMessage((message) => {
      messages = [...messages, message];
      // Auto-scroll to bottom on new message
      setTimeout(() => {
        const messageList = document.querySelector('.overflow-y-auto');
        if (messageList) {
          messageList.scrollTop = messageList.scrollHeight;
        }
      }, 0);
    });

    // Subscribe to coin balance updates
    const unsubscribeCoinBalance = socketService.onCoinBalance(({ coins }) => {
      authStore.updateCoins(coins);
    });

    // Subscribe to socket errors
    const unsubscribeError = socketService.onError((error) => {
      // You could show a toast notification here
      console.error('Socket error:', error);
      alert(error.message);
    });

    return () => {
      unsubscribeRecent();
      unsubscribeNew();
      unsubscribeCoinBalance();
      unsubscribeError();
      socketService.disconnect();
    };
  });

  function handleSendMessage(event: MessageEvent) {
    if (!user) return;

    const messageData = {
      id: Date.now(),
      text: event.detail,
      sender: isAnonymous ? 'Anonymous' : user.username,
      isAnonymous,
      type: 'text' as const,
      timestamp: new Date()
    };
    
    socketService.sendMessage(messageData);
  }

  async function handleSendImage(event: ImageEvent) {
    if (!user) return;

    try {
        const { file, caption } = event.detail;
        const { fileUrl } = await uploadService.uploadMeme(file);
        
        const messageData = {
            id: Date.now(),
            text: '',
            sender: isAnonymous ? 'Anonymous' : user.username,
            isAnonymous,
            type: 'meme' as const,
            imageUrl: fileUrl,
            caption,
            timestamp: new Date()
        };
        
        socketService.sendMessage(messageData);
    } catch (error) {
        console.error('Error uploading meme:', error);
        // You might want to show an error message to the user here
        alert('Failed to upload meme. Please try again.');
    }
  }

  function handleToggleAnonymous() {
    isAnonymous = !isAnonymous;
    // Add visual feedback
    const feedback = isAnonymous ? 'Anonymous mode enabled' : 'Anonymous mode disabled';
    // You could add a toast notification here if you want
  }

  function handleLeaveRoom() {
    // TODO: Disconnect from Socket.IO
    goto('/');
  }

  async function handleLogout() {
    try {
      socketService.disconnect();
      await authService.logout();
      goto('/login', { replaceState: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function handleIntroComplete() {
    showIntro = false;
  }

  function handleNavigateToPlans() {
    goto('/plans');
  }
</script>

{#if mounted}
  {#if showIntro}
    <IntroAnimation onComplete={handleIntroComplete} />
  {:else}
    <div class="flex flex-col h-screen" in:fade={{ duration: 300 }}>
      <header class="bg-white/80 backdrop-blur-sm shadow-sm p-3 flex-none sticky top-0 z-50">
        <div class="max-w-7xl mx-auto">
          <!-- Top row with logo and logout -->
          <div class="flex items-center justify-between mb-2 sm:mb-0">
            <div class="flex items-center gap-2">
              <span class="text-xl sm:text-2xl">🤫</span>
              <h1 class="text-lg sm:text-xl font-bold text-gray-900">SneakySpeak</h1>
            </div>
            <button
              on:click={handleLogout}
              class="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Bottom row with user info -->
          {#if user}
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <div class="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                <span class="font-medium text-green-600">🤫:</span>
                <button
                  class="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition-colors flex items-center gap-1"
                  on:click={() => showUsernameModal = true}
                >
                  {user.username}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
              {#if isAnonymous}
                <div class="flex items-center">
                  <span class="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    Anonymous mode
                  </span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </header>

      <main class="flex-1 overflow-hidden bg-gray-50 flex flex-col">
        <div class="max-w-7xl mx-auto w-full h-full flex flex-col p-2 sm:p-4">
          <div class="flex-1 overflow-y-auto min-h-0">
            <MessageList {messages} />
          </div>
          <div class="flex-none mt-2 sm:mt-4">
            <MessageInput 
              {isAnonymous}
              {coins}
              on:sendMessage={(e: MessageEvent) => handleSendMessage(e)}
              on:sendImage={(e: ImageEvent) => handleSendImage(e)}
              on:toggleAnonymous={handleToggleAnonymous}
              on:navigateToPlans={handleNavigateToPlans}
            />
          </div>
        </div>
      </main>
    </div>
  {/if}
{/if}

{#if showUsernameModal && user}
  <UpdateUsernameModal
    currentUsername={user.username}
    on:close={() => showUsernameModal = false}
  />
{/if}

<style>
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
  }
</style> 