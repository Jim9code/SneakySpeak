<script>
	import '../app.css';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
</script>

<slot />

<InstallPrompt />

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}
</style>
