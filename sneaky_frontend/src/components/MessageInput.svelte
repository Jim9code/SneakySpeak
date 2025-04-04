<script>
  import { createEventDispatcher } from 'svelte';
  import EmojiPicker from './EmojiPicker.svelte';

  export let isAnonymous = false;

  const dispatch = createEventDispatcher();
  let message = '';
  let showEmojiPicker = false;

  function handleSubmit(e) {
    e.preventDefault();
    if (message.trim()) {
      dispatch('sendMessage', message.trim());
      message = '';
    }
  }

  function handleEmojiSelect(emoji) {
    message += emoji;
    showEmojiPicker = false;
  }
</script>

<div class="bg-white border-t border-gray-200 p-4">
  <form on:submit={handleSubmit} class="max-w-7xl mx-auto flex items-center space-x-4">
    <div class="relative flex-1">
      <input
        type="text"
        bind:value={message}
        placeholder={isAnonymous ? "Send anonymously..." : "Type a message..."}
        class="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
      />
      
      <button
        type="button"
        on:click={() => showEmojiPicker = !showEmojiPicker}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        😊
      </button>

      {#if showEmojiPicker}
        <div class="absolute bottom-full right-0 mb-2">
          <EmojiPicker on:select={e => handleEmojiSelect(e.detail)} />
        </div>
      {/if}
    </div>

    <button
      type="submit"
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Send
    </button>
  </form>
</div> 