import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
    const { isAuthenticated } = await parent();
    
    if (!isAuthenticated) {
        throw redirect(307, '/login');
    }

    return {};
}; 