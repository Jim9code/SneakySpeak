<script>
  export let messages = [];

  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex-1 overflow-y-auto space-y-4 p-4">
  {#each messages as message (message.id)}
    <div class="flex items-start space-x-2">
      <div class="flex-1 bg-white rounded-lg shadow-sm p-4">
        <div class="flex justify-between items-start">
          <span class="font-medium text-gray-900">
            {message.isAnonymous ? 'Anonymous' : message.sender}
          </span>
          <span class="text-sm text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p class="mt-1 text-gray-800">{message.text}</p>
      </div>
    </div>
  {/each}
</div>

<style>
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
</style> 