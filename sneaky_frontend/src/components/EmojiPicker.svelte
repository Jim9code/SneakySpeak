<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  // Common emojis for quick access
  const emojis = [
    '😊', '😂', '🤣', '❤️', '👍', '🎉',
    '😎', '🤔', '😅', '😭', '😍', '🙌',
    '👏', '🔥', '💯', '✨', '🌟', '💪',
    '🤝', '👋', '🤗', '🙏', '💖', '💡'
  ];

  function handleEmojiClick(emoji) {
    dispatch('select', emoji);
  }
</script>

<div class="bg-white rounded-lg shadow-lg p-2 w-64">
  <div class="grid grid-cols-6 gap-2">
    {#each emojis as emoji}
      <button
        type="button"
        on:click={() => handleEmojiClick(emoji)}
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
      >
        {emoji}
      </button>
    {/each}
  </div>
</div>

<style>
  button {
    font-size: 1.25rem;
    line-height: 1;
  }
</style> 