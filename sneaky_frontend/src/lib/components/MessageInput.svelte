<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import { socketService } from '$lib/services/socketService';
  import { API_URL } from '$lib/config';
  import { fade, slide } from 'svelte/transition';
  import { authStore } from '$lib/stores/authStore';

  export let isAnonymous = false;
  export let replyTo: {
    id: number;
    text: string;
    sender: string;
    isAnonymous: boolean;
    type?: 'text' | 'meme';
    imageUrl?: string;
    caption?: string;
  } | null = null;

  const dispatch = createEventDispatcher<{
    sendMessage: string;
    sendImage: { file: File; caption?: string };
    toggleAnonymous: void;
    navigateToPlans: void;
    cancelReply: void;
  }>();
  
  let message = '';
  let showEmojiPicker = false;
  let imagePreview: string | null = null;
  let selectedFile: File | null = null;
  let fileInput: HTMLInputElement;
  let emojiPickerContainer: HTMLDivElement;
  let emojiButton: HTMLButtonElement;
  let typingTimeout: ReturnType<typeof setTimeout>;

  // Add new variables for mobile menu
  let showMobileMenu = false;
  let mobileMenuButton: HTMLButtonElement;
  let mobileMenuContainer: HTMLDivElement;

  // Get coins from auth store
  $: coins = $authStore.user?.coins ?? 0;

  // Handle reply prefill
  $: if (replyTo) {
    const quotePrefix = `@ ${replyTo.isAnonymous ? 'Anonymous' : replyTo.sender}: `;
    const quoteContent = replyTo.type === 'meme' 
      ? (replyTo.caption || '[shared a meme]')
      : replyTo.text;
    message = `${quotePrefix}${quoteContent}\n\n 👉`;
  }

  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ANONYMOUS_TEXT_COST = 2;
  const ANONYMOUS_IMAGE_COST = 4;

  function getCost(): number {
    if (!isAnonymous) return 0;
    return selectedFile ? ANONYMOUS_IMAGE_COST : ANONYMOUS_TEXT_COST;
  }

  function hasEnoughCoins(): boolean {
    return coins >= getCost();
  }

  function handleInput() {
    if (message.length > 0) {
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Emit typing event
      socketService.emitTyping();
      
      // Set a new timeout
      typingTimeout = setTimeout(() => {
        socketService.emitStopTyping();
      }, 1000); // Stop typing after 1 second of no input
    } else {
      // If message is empty, stop typing immediately
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      socketService.emitStopTyping();
    }
  }

  onMount(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiPickerContainer && !emojiPickerContainer.contains(event.target as Node) && !emojiButton.contains(event.target as Node)) {
        showEmojiPicker = false;
      }
      if (showMobileMenu && mobileMenuContainer && !mobileMenuContainer.contains(event.target as Node) && !mobileMenuButton.contains(event.target as Node)) {
        showMobileMenu = false;
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      // Cleanup timeout on component destroy
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      socketService.emitStopTyping();
    };
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    sendMessage();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleCancelReply() {
    dispatch('cancelReply');
  }

  function sendMessage() {
    if (!hasEnoughCoins()) {
      alert('Not enough coins for anonymous message!');
      return;
    }

    if (selectedFile) {
      dispatch('sendImage', { 
        file: selectedFile,
        caption: message.trim() || undefined
      });
      clearImagePreview();
      message = '';
      // Update local coin display immediately
      if (isAnonymous) {
        coins -= ANONYMOUS_IMAGE_COST;
      }
    } else if (message.trim()) {
      dispatch('sendMessage', message.trim());
      message = '';
      // Update local coin display immediately
      if (isAnonymous) {
        coins -= ANONYMOUS_TEXT_COST;
      }
    }

    // Clear reply after sending
    if (replyTo) {
      handleCancelReply();
    }
  }

  function handleEmojiSelect(e: CustomEvent<string>) {
    message += e.detail;
    showEmojiPicker = false;
  }

  function handleToggleAnonymous() {
    dispatch('toggleAnonymous');
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert('Please select a meme file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('Meme must be less than 5MB');
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function clearImagePreview() {
    imagePreview = null;
    selectedFile = null;
    if (fileInput) fileInput.value = '';
  }
</script>

<div class="bg-gray-900 shadow-lg rounded-lg p-3 sm:p-4 relative border border-gray-800/50">
  {#if replyTo}
    <div 
      class="flex items-center gap-2 p-2 mb-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
      transition:slide
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-300">
            Replying to {replyTo.isAnonymous ? 'Anonymous' : replyTo.sender}
          </span>
        </div>
        <p class="text-sm text-gray-400 truncate">
          {replyTo.type === 'meme' 
            ? (replyTo.caption || '[shared a meme]')
            : replyTo.text}
        </p>
      </div>
      <button
        type="button"
        class="p-1 text-gray-500 hover:text-gray-300 focus:outline-none"
        on:click={handleCancelReply}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  {/if}

  {#if selectedFile}
    <div class="space-y-3">
      <div class="relative">
        <img
          src={imagePreview}
          alt="Meme preview"
          class="max-h-48 sm:max-h-64 w-auto mx-auto rounded-lg shadow-sm"
        />
        <button
          type="button"
          class="absolute top-2 right-2 p-1 bg-red-500/90 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          on:click={clearImagePreview}
        >
          <svg class="h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex items-center space-x-2 sm:space-x-3">
        <!-- Anonymous Toggle - Always visible -->
        <button
          type="button"
          class="p-2 {isAnonymous ? 'text-indigo-400' : 'text-gray-400'} hover:text-indigo-300 focus:outline-none focus:text-indigo-300 transition-colors relative group"
          title={isAnonymous ? 'Currently anonymous' : 'Currently showing username'}
          on:click={() => dispatch('toggleAnonymous')}
        >
          <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isAnonymous ? 
              "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" :
              "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            } />
          </svg>
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {isAnonymous ? 'Anonymous mode on' : 'Anonymous mode off'}
    </div>
        </button>

    <div class="flex-1 min-w-0">
      <input
        type="text"
        bind:value={message}
            placeholder="Add a caption (optional)"
            class="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-gray-800/50 text-gray-100 border border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500"
      />
    </div>

    <div class="flex items-center space-x-1 sm:space-x-2">
          <!-- Mobile Menu Button - Small screens only -->
      <button
            bind:this={mobileMenuButton}
        type="button"
            class="p-2 text-gray-400 hover:text-indigo-300 focus:outline-none focus:text-indigo-300 transition-colors relative sm:hidden"
            on:click={() => showMobileMenu = !showMobileMenu}
      >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
      </button>

          <!-- Desktop Icons - Large screens only -->
          <div class="hidden sm:flex items-center space-x-1 sm:space-x-2">
            <!-- Coin Display -->
            <div class="flex items-center group">
              <div class="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 shadow-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium text-sm text-yellow-400">{coins}</span>
                {#if coins === 0}
                  <button
                    type="button"
                    class="ml-1 p-1 text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
                    title="Buy more coins"
                    on:click={() => dispatch('navigateToPlans')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                {/if}
              </div>
              {#if isAnonymous}
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Cost: {getCost()} {getCost() === 1 ? 'coin' : 'coins'}
                </div>
              {/if}
            </div>

      <button
        bind:this={emojiButton}
        type="button"
        class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors relative"
        title="Add emoji"
        on:click={(e) => {
          e.stopPropagation();
          showEmojiPicker = !showEmojiPicker;
        }}
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
          </div>

          <!-- Send Button - Always visible -->
          <button
            type="button"
            on:click={sendMessage}
            disabled={!message && !selectedFile || (isAnonymous && !hasEnoughCoins())}
            class="p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={isAnonymous && !hasEnoughCoins() ? 'Not enough coins' : 'Send message'}
          >
            <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex items-center space-x-2 sm:space-x-3">
      <!-- Anonymous Toggle - Always visible -->
      <button
        type="button"
        class="p-2 {isAnonymous ? 'text-indigo-400' : 'text-gray-400'} hover:text-indigo-300 focus:outline-none focus:text-indigo-300 transition-colors relative group"
        title={isAnonymous ? 'Currently anonymous' : 'Currently showing username'}
        on:click={() => dispatch('toggleAnonymous')}
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isAnonymous ? 
            "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" :
            "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          } />
        </svg>
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isAnonymous ? 'Anonymous mode on' : 'Anonymous mode off'}
        </div>
      </button>

      <!-- Mobile Anonymous Toggle - Small screens only -->
      <button
        type="button"
        class="p-2 {isAnonymous ? 'text-indigo-400' : 'text-gray-400'} hover:text-indigo-300 focus:outline-none focus:text-indigo-300 transition-colors relative group sm:hidden"
        title={isAnonymous ? 'Currently anonymous' : 'Currently showing username'}
        on:click={() => dispatch('toggleAnonymous')}
      >
        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isAnonymous ? 
            "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" :
            "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          } />
        </svg>
      </button>

      <div class="flex-1 min-w-0">
        <input
          type="text"
          bind:value={message}
          on:keydown={handleKeyDown}
          on:input={handleInput}
          placeholder={isAnonymous ? `Anonymous message (${ANONYMOUS_TEXT_COST} coins)` : "Type a message..."}
          class="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-gray-800/50 text-gray-100 border border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500"
        />
      </div>

      <div class="flex items-center space-x-1 sm:space-x-2">
        <!-- Mobile Menu Button - Small screens only -->
        <button
          bind:this={mobileMenuButton}
          type="button"
          class="p-2 text-gray-400 hover:text-indigo-300 focus:outline-none focus:text-indigo-300 transition-colors relative sm:hidden"
          on:click={() => showMobileMenu = !showMobileMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Desktop Icons - Large screens only -->
        <div class="hidden sm:flex items-center space-x-1 sm:space-x-2">
          <!-- Coin Display -->
          <div class="flex items-center group">
            <div class="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 shadow-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
              </svg>
              <span class="font-medium text-sm text-yellow-400">{coins}</span>
              {#if coins === 0}
                <button
                  type="button"
                  class="ml-1 p-1 text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
                  title="Buy more coins"
                  on:click={() => dispatch('navigateToPlans')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>

          <button
            type="button"
            class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors relative group"
            title="Share a meme"
            on:click={() => fileInput.click()}
          >
            <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {#if isAnonymous}
              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Anonymous meme: {ANONYMOUS_IMAGE_COST} coins
              </div>
            {/if}
          </button>

          <button
            bind:this={emojiButton}
            type="button"
            class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors relative"
            title="Add emoji"
            on:click={(e) => {
              e.stopPropagation();
              showEmojiPicker = !showEmojiPicker;
            }}
          >
            <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <!-- Send Button - Always visible -->
        <button
          type="button"
          on:click={sendMessage}
          disabled={!message && !selectedFile || (isAnonymous && !hasEnoughCoins())}
          class="p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={isAnonymous && !hasEnoughCoins() ? 'Not enough coins' : 'Send message'}
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
  {/if}

  <!-- Mobile Menu - Small screens only -->
  {#if showMobileMenu}
    <div
      bind:this={mobileMenuContainer}
      class="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-lg border border-gray-800/50 p-2 sm:hidden"
      transition:slide
    >
      <div class="flex flex-col space-y-2">
        <!-- Coin Display -->
        <div class="flex items-center group">
          <div class="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 shadow-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
            </svg>
            <span class="font-medium text-sm text-yellow-400">{coins}</span>
            {#if coins === 0}
              <button
                type="button"
                class="ml-1 p-1 text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
                title="Buy more coins"
                on:click={() => dispatch('navigateToPlans')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
              </button>
            {/if}
          </div>
          {#if isAnonymous}
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Cost: {getCost()} {getCost() === 1 ? 'coin' : 'coins'}
            </div>
          {/if}
        </div>

        <button
          type="button"
          class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors relative group"
          title="Share a meme"
          on:click={() => {
            fileInput.click();
            showMobileMenu = false;
          }}
        >
          <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {#if isAnonymous}
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Anonymous meme: {ANONYMOUS_IMAGE_COST} coins
            </div>
          {/if}
        </button>

        <button
          type="button"
          class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors relative"
          title="Add emoji"
          on:click={(e) => {
            e.stopPropagation();
            showEmojiPicker = !showEmojiPicker;
            showMobileMenu = false;
          }}
        >
          <svg class="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  {#if showEmojiPicker}
    <div bind:this={emojiPickerContainer} class="absolute bottom-full right-0 mb-2">
      <EmojiPicker on:select={handleEmojiSelect} />
    </div>
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    on:change={handleFileSelect}
    class="hidden"
  />
</div>

<style>
  /* Add any component-specific styles here */
  :global(.emoji-picker) {
    z-index: 50;
  }
</style>