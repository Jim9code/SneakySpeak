import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authStore } from '$lib/stores/authStore';
import { get } from 'svelte/store';

export const load: PageLoad = async ({ parent }) => {
  const auth = get(authStore);
  
  if (!auth.user) {
    throw redirect(307, '/login');
  }

  // Get the session data from the parent layout
  const { session } = await parent();

  return {
    user: auth.user,
    token: session?.token
  };
}; 