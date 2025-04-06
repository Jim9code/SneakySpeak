<script lang="ts">
  import { authStore } from '$lib/stores/authStore';
  import { onMount, onDestroy } from 'svelte';
  import { socketService } from '$lib/services/socketService';
  import { fade, slide } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

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

  export let messages: Message[] = [];
  
  // Get current user from auth store
  $: currentUser = $authStore.user;

  let messageContainer: HTMLElement;
  let shouldAutoScroll = true;
  let isUserScrolling = false;
  let scrollTimeout: ReturnType<typeof setTimeout>;
  let hasOverflow = false;
  let previousMessagesLength = 0;
  let isTyping = false;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let activeMessageId: number | null = null;
  let swipeThreshold = 50; // pixels to trigger reply action
  let showScrollButton = false; // New variable for scroll button visibility

  // Track revealed anonymous messages
  let revealedMessages: Set<number> = new Set();
  let hideTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  const dispatch = createEventDispatcher<{
    reply: Message;
  }>();

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function isOwnMessage(message: Message): boolean {
    return Boolean(currentUser && message.sender === currentUser.username);
  }

  function checkOverflow() {
    if (!messageContainer) return false;
    return messageContainer.scrollHeight > messageContainer.clientHeight;
  }

  function isNearBottom() {
    if (!messageContainer) return false;
    
    const threshold = 150; // pixels from bottom
    const position = messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight;
    return position <= threshold;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!messageContainer) return;
    
    requestAnimationFrame(() => {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior
      });
    });
  }

  function handleScroll() {
    // Clear existing timeout
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    isUserScrolling = true;
    const wasNearBottom = isNearBottom();
    
    // Update scroll button visibility
    showScrollButton = !wasNearBottom;
    
    // Set a timeout to detect when scrolling ends
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
      shouldAutoScroll = wasNearBottom;
    }, 150);
  }

  function handleTouchStart(event: TouchEvent, message: Message) {
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
    activeMessageId = message.id;
  }

  function handleTouchMove(event: TouchEvent, messageElement: HTMLElement) {
    if (!activeMessageId) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = Math.abs(touch.clientY - swipeStartY);

    // If vertical movement is greater than horizontal, cancel swipe
    if (deltaY > Math.abs(deltaX)) {
      activeMessageId = null;
      return;
    }

    // Only allow right swipe for reply
    if (deltaX > 0) {
      const swipePercent = Math.min(deltaX / swipeThreshold, 1);
      messageElement.style.transform = `translateX(${deltaX}px)`;
      messageElement.style.opacity = (1 - swipePercent * 0.3).toString();
    }
  }

  function handleTouchEnd(event: TouchEvent, message: Message, messageElement: HTMLElement) {
    if (!activeMessageId) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    messageElement.style.transform = '';
    messageElement.style.opacity = '1';

    if (deltaX >= swipeThreshold) {
      dispatch('reply', message);
    }

    activeMessageId = null;
  }

  // Helper function to trigger reactivity
  function updateRevealedMessages(messageId: number, revealed: boolean) {
    if (revealed) {
      revealedMessages.add(messageId);
    } else {
      revealedMessages.delete(messageId);
    }
    revealedMessages = new Set(revealedMessages); // Create new Set to trigger reactivity
  }

  function toggleReveal(messageId: number) {
    if (revealedMessages.has(messageId)) {
      return; // Don't allow manual hiding
    }

    // Clear any existing timeout
    if (hideTimeouts.has(messageId)) {
      clearTimeout(hideTimeouts.get(messageId));
      hideTimeouts.delete(messageId);
    }

    // Show message immediately
    updateRevealedMessages(messageId, true);

    // Set new timeout to hide after 10 seconds
    const timeout = setTimeout(() => {
      updateRevealedMessages(messageId, false);
    }, 10000);

    hideTimeouts.set(messageId, timeout);
  }

  function handleScrollButtonClick() {
    scrollToBottom();
    showScrollButton = false;
    shouldAutoScroll = true;
  }

  // Cleanup timeouts on component destroy
  onDestroy(() => {
    hideTimeouts.forEach(timeout => clearTimeout(timeout));
  });

  // Watch for changes in messages array
  $: if (messages && messageContainer) {
    hasOverflow = checkOverflow();
    
    // If new messages arrived
    if (messages.length > previousMessagesLength) {
      // Auto-scroll if we're near the bottom or if auto-scroll is enabled
      if (shouldAutoScroll && !isUserScrolling) {
        // Use immediate scroll for own messages, smooth scroll for others
        const lastMessage = messages[messages.length - 1];
        const behavior = isOwnMessage(lastMessage) ? 'auto' : 'smooth';
        
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom(behavior);
          });
        });
      }
    }
    
    previousMessagesLength = messages.length;
  }

  onMount(() => {
    if (messageContainer) {
      messageContainer.addEventListener('scroll', handleScroll);
      hasOverflow = checkOverflow();
      previousMessagesLength = messages.length;
      
      // Initial scroll to bottom with a small delay to ensure content is rendered
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);

      // Subscribe to typing events
      const unsubscribeTypingStart = socketService.onTypingStart(() => {
        isTyping = true;
        if (shouldAutoScroll && !isUserScrolling) {
          scrollToBottom();
        }
      });

      const unsubscribeTypingStop = socketService.onTypingStop(() => {
        isTyping = false;
      });

      return () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        messageContainer.removeEventListener('scroll', handleScroll);
        unsubscribeTypingStart();
        unsubscribeTypingStop();
      };
    }
  });
</script>

<div class="h-full flex flex-col overflow-hidden relative">
  <!-- Animated background elements -->
  <div class="fixed inset-0 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden pointer-events-none z-0">
    <div class="absolute inset-0 bg-grid opacity-5"></div>
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

  <!-- Messages content -->
  <div 
    bind:this={messageContainer}
    class="flex-1 overflow-y-auto overflow-x-hidden px-4 space-y-3 sm:space-y-4 relative z-10 scroll-smooth"
  >
  {#if messages.length === 0}
    <div class="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-400">
      <svg class="w-16 h-16 sm:w-20 sm:h-20 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm sm:text-base font-medium mb-1 text-gray-300">No messages yet</p>
      <p class="text-xs sm:text-sm text-gray-500">Start the conversation by sending a message!</p>
    </div>
  {:else}
    {#each messages as message (message.id)}
      <div 
        class="message-container animate-message-in w-full"
        class:sent={isOwnMessage(message)}
        class:received={!isOwnMessage(message)}
        on:touchstart={(e) => handleTouchStart(e, message)}
        on:touchmove={(e) => handleTouchMove(e, e.currentTarget)}
        on:touchend={(e) => handleTouchEnd(e, message, e.currentTarget)}
        style="touch-action: pan-y; transition: transform 0.2s ease, opacity 0.2s ease;"
      >
        <div class="flex items-start gap-2 sm:gap-3 w-full">
          <!-- Reply indicator -->
          {#if activeMessageId === message.id}
            <div 
              class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 text-indigo-400"
              transition:fade
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          {/if}

          <div class="flex-1 flex {isOwnMessage(message) ? 'justify-end' : 'justify-start'} w-full">
            <div class="max-w-[85%] {isOwnMessage(message) ? 'ml-auto' : 'mr-auto'} flex items-start gap-2 sm:gap-3">
              {#if !isOwnMessage(message) && !message.isAnonymous}
                <div class="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-transparent border-2 border-gray-600/50 shadow-[0_0_10px_rgba(75,85,99,0.2)] flex items-center justify-center text-sm sm:text-base font-medium text-gray-300">
                  {message.sender[0].toUpperCase()}
                </div>
              {/if}
              <div class="flex flex-col {isOwnMessage(message) ? 'items-end' : 'items-start'}">
                <div class="{
                  isOwnMessage(message) 
                    ? 'bg-transparent border-2 border-indigo-500/50 text-gray-100 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:border-indigo-400/60' 
                    : message.isAnonymous
                      ? 'bg-gray-900 text-white shadow-gray-900/20 border-none'
                      : 'bg-transparent border-2 border-gray-600/50 text-gray-100 shadow-[0_0_15px_rgba(75,85,99,0.2)] hover:shadow-[0_0_20px_rgba(75,85,99,0.3)] hover:border-gray-500/60'
                } {message.type === 'meme' ? 'overflow-hidden' : ''} shadow-lg transition-all duration-200 {
                  isOwnMessage(message)
                    ? 'rounded-l-lg rounded-tr-sm rounded-br-lg'
                    : 'rounded-r-lg rounded-tl-sm rounded-bl-lg'
                } p-2.5 sm:p-3">
                  <div class="flex flex-col gap-1.5">
                    {#if message.isAnonymous}
                      <div class="relative">
                        <div class="flex flex-col gap-1.5">
                          <span class="text-xs sm:text-sm text-gray-400">
                            Anonymous
                          </span>
                          {#if message.type === 'meme' && message.imageUrl}
                            <div class="space-y-2">
                              <img
                                src={message.imageUrl}
                                alt="Shared meme"
                                class="max-h-48 sm:max-h-64 w-auto rounded-md cursor-zoom-in hover:opacity-90 transition-opacity"
                              />
                              {#if message.caption}
                                <p class="text-sm sm:text-base break-words leading-relaxed">{message.caption}</p>
                              {/if}
                            </div>
                          {:else}
                            <p class="text-sm sm:text-base break-words leading-relaxed">{message.text}</p>
                          {/if}
                          <span class="text-[10px] sm:text-xs text-gray-400 self-end">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>

                        <!-- Anonymous message overlay -->
                        {#if !revealedMessages.has(message.id)}
                          <div 
                            class="absolute inset-0 bg-gray-900/95 backdrop-blur-sm rounded-lg flex items-center justify-center cursor-pointer group transition-all duration-150"
                            on:click|stopPropagation={() => toggleReveal(message.id)}
                            transition:fade={{ duration: 150 }}
                          >
                            <div class="transform group-hover:scale-110 transition-transform duration-150">
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                class="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 group-hover:text-gray-100" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path 
                                  stroke-linecap="round" 
                                  stroke-linejoin="round" 
                                  stroke-width="2" 
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                                />
                                <path 
                                  stroke-linecap="round" 
                                  stroke-linejoin="round" 
                                  stroke-width="2" 
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                                />
                              </svg>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {:else}
                      <div class="flex flex-col gap-1.5">
                        <span class="text-xs sm:text-sm text-gray-400">
                          {message.sender}
                        </span>
                        {#if message.type === 'meme' && message.imageUrl}
                          <div class="space-y-2">
                            <img
                              src={message.imageUrl}
                              alt="Shared meme"
                              class="max-h-48 sm:max-h-64 w-auto rounded-md cursor-zoom-in hover:opacity-90 transition-opacity"
                            />
                            {#if message.caption}
                              <p class="text-sm sm:text-base break-words leading-relaxed">{message.caption}</p>
                            {/if}
                          </div>
                        {:else}
                          <p class="text-sm sm:text-base break-words leading-relaxed">{message.text}</p>
                        {/if}
                        <span class="text-[10px] sm:text-xs text-gray-400 self-end">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
              {#if isOwnMessage(message) && !message.isAnonymous}
                <div class="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-transparent border-2 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)] flex items-center justify-center text-sm sm:text-base font-medium text-gray-300">
                  {message.sender[0].toUpperCase()}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/each}
  {/if}

  <!-- Typing indicator -->
  {#if isTyping}
    <div class="p-4" transition:fade>
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  {/if}

  <!-- Scroll to bottom button -->
  {#if showScrollButton}
    <button
      type="button"
      class="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-50 p-2.5 sm:p-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl backdrop-blur-sm transition-all duration-200 group"
      on:click={handleScrollButtonClick}
      transition:fade={{ duration: 200 }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-5 w-5 sm:h-6 sm:w-6 transform group-hover:translate-y-0.5 transition-transform" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
      <span class="sr-only">Scroll to bottom</span>
    </button>
  {/if}
  </div>
</div>

<style>
  /* Custom scrollbar styles */
  .scroll-smooth {
    scroll-behavior: smooth;
  }

  div {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
    -webkit-overflow-scrolling: touch;
  }
  
  div::-webkit-scrollbar {
    width: 6px;
  }
  
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  
  div::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.3);
    border-radius: 3px;
  }

  /* Message animation styles */
  .message-container {
    opacity: 0;
    transform: scale(0.5);
    animation: message-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    position: relative;
    touch-action: pan-y;
    will-change: transform;
  }

  .sent {
    transform-origin: right center;
  }

  .received {
    transform-origin: left center;
  }

  @keyframes message-pop-in {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Floating animation for background elements */
  @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
  @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1.1); } 50% { transform: translate(-20px, 20px) scale(1); } }
  @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(0.9); } 50% { transform: translate(40px, 20px) scale(1); } }
  @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1.2); } 50% { transform: translate(-30px, -40px) scale(1.1); } }
  @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(0.8); } 50% { transform: translate(20px, 30px) scale(0.9); } }

  /* Add a subtle bounce effect for meme images */
  img {
    animation: image-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes image-bounce {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Typing indicator styles */
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(75, 85, 99, 0.4);
    border-radius: 12px;
    width: fit-content;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #6366f1;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Add smooth transition for scroll button */
  button {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }

  button:hover {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  }
</style> 