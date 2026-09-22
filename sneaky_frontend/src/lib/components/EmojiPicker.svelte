<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    select: string;
  }>();
  
  // Common emojis for quick access
  const emojis = [
    '😊', '😂', '🤣', '❤️', '👍', '🎉',
    '😎', '🤔', '😅', '😭', '😍', '🙌',
    '👏', '🔥', '💯', '✨', '🌟', '💪',
    '🤝', '👋', '🤗', '🙏', '💖', '💡'
  ];

  function handleEmojiClick(emoji: string) {
    dispatch('select', emoji);
  }
</script>

<div class="bg-neutral-950 rounded-2xl shadow-2xl p-3 border border-neutral-800/90 emoji-picker">
  <div class="grid grid-cols-6 gap-2">
    {#each emojis as emoji}
      <button
        type="button"
        on:click={() => handleEmojiClick(emoji)}
        class="w-9 h-9 flex items-center justify-center hover:bg-neutral-900 rounded-xl transition-colors text-xl"
      >
        {emoji}
      </button>
    {/each}
  </div>
</div>

<style>
  .emoji-picker {
    min-width: 280px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  button {
    font-size: 1.25rem;
    line-height: 1;
    user-select: none;
    cursor: pointer;
  }

  button:hover {
    transform: scale(1.1);
    transition: transform 0.1s ease-in-out;
  }
</style> 