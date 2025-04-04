<script>
  import { createEventDispatcher } from 'svelte';

  export let isAnonymous = false;
  const dispatch = createEventDispatcher();

  function handleToggleAnonymous() {
    dispatch('toggleAnonymous');
  }
</script>

<div class="flex items-center space-x-4">
  <div class="flex items-center">
    <label for="anonymous-toggle" class="mr-3 text-sm text-gray-600">
      {isAnonymous ? 'Anonymous' : 'Named'}
    </label>
    <button
      type="button"
      role="switch"
      aria-checked={isAnonymous}
      id="anonymous-toggle"
      on:click={handleToggleAnonymous}
      class={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${isAnonymous ? 'bg-indigo-600' : 'bg-gray-200'}
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