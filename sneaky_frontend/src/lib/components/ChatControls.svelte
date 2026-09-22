<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isAnonymous = false;
  const dispatch = createEventDispatcher<{
    toggleAnonymous: void;
  }>();

  function handleToggleAnonymous() {
    dispatch('toggleAnonymous');
  }
</script>

<div class="flex items-center space-x-4">
  <div class="flex items-center">
    <label for="anonymous-toggle" class="mr-3 text-sm text-neutral-400 font-medium">
      {isAnonymous ? '🤫 Anonymous' : '👤 Named'}
    </label>
    <button
      type="button"
      role="switch"
      aria-checked={isAnonymous}
      id="anonymous-toggle"
      on:click={handleToggleAnonymous}
      class={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-neutral-800
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black
        ${isAnonymous ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-neutral-900'}
      `}
    >
      <span
        class={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${isAnonymous ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  </div>
</div> 