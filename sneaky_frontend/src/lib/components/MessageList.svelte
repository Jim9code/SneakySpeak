<script lang="ts">
  import { authStore } from '$lib/stores/authStore';

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

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function isOwnMessage(message: Message): boolean {
    return Boolean(currentUser && message.sender === currentUser.username);
  }
</script>

<div class="chat-container relative min-h-full">
  <!-- Animated background elements -->
  <div class="fixed inset-0 bg-gradient-to-br from-gray-50 to-white overflow-hidden pointer-events-none z-0">
    <div class="absolute inset-0 bg-grid opacity-10"></div>
    {#each Array(5) as _, i}
      <div
        class="absolute rounded-full bg-gradient-to-r from-blue-100/30 to-purple-100/30 blur-2xl"
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
  <div class="space-y-3 sm:space-y-4 p-2 sm:p-4 relative z-10">
    {#if messages.length === 0}
      <div class="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500">
        <svg class="w-16 h-16 sm:w-20 sm:h-20 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm sm:text-base font-medium mb-1">No messages yet</p>
        <p class="text-xs sm:text-sm text-gray-400">Start the conversation by sending a message!</p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <div 
          class="message-container animate-message-in w-full"
          class:sent={isOwnMessage(message)}
          class:received={!isOwnMessage(message)}
        >
          <div class="flex items-start gap-2 sm:gap-3 w-full">
            <div class="flex-1 flex {isOwnMessage(message) ? 'justify-end' : 'justify-start'} w-full">
              <div class="max-w-[85%] {isOwnMessage(message) ? 'ml-auto' : 'mr-auto'}">
                <div class="flex flex-col {isOwnMessage(message) ? 'items-end' : 'items-start'}">
                  <span class="text-sm text-gray-500 mb-1 {isOwnMessage(message) ? 'text-right' : 'text-left'} w-full">
                    {message.isAnonymous ? 'Anonymous' : message.sender} • {formatTime(message.timestamp)}
                  </span>
                  <div class="rounded-lg p-3 sm:p-4 {isOwnMessage(message) ? 'bg-blue-500 text-white shadow-blue-200/50' : 'bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-900'} {message.type === 'meme' ? 'overflow-hidden' : ''} shadow-lg hover:shadow-xl transition-shadow">
                    {#if message.type === 'meme' && message.imageUrl}
                      <div class="space-y-2">
                        <img
                          src={message.imageUrl}
                          alt="Shared meme"
                          class="max-h-48 sm:max-h-64 w-auto rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                        {#if message.caption}
                          <p class="text-xs sm:text-sm break-words">{message.caption}</p>
                        {/if}
                      </div>
                    {:else}
                      <p class="text-xs sm:text-sm break-words">{message.text}</p>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .chat-container {
    min-height: 100vh;
    background-attachment: fixed;
  }

  .bg-grid {
    background-image: 
      linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  /* Custom scrollbar styles */
  div {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  
  div::-webkit-scrollbar {
    width: 6px;
  }
  
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  
  div::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  /* Message animation styles */
  .message-container {
    opacity: 0;
    transform: scale(0.5);
    animation: message-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
</style>