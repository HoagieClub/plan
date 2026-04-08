import type { Profile } from '@/types';

import { fetchCsrfToken } from '@/utils/csrf';

// Fetch user profile from the backend
export async function fetchCustomUser(
    netId: string,
    firstName: string,
    lastName: string,
    email: string
): Promise<Profile | null> {
    try {
        const csrfToken = await fetchCsrfToken();

        const response = await fetch(`/api/hoagie/profile/get_user`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({
                netId,
                firstName,
                lastName,
                email,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('User not authenticated.');
                return null;
            }
            if (response.status === 404) {
                console.error('User profile not found.');
                return null;
            }
            throw new Error(`Error fetching CustomUser: ${response.statusText}`);
        }

        const data = await response.json();
        return data as Profile;
    } catch (error) {
        console.error('Error fetching CustomUser:', error);
        return null;
    }
}
// Update user profile
export async function updateUserProfile(
    updatedProfile: Profile
): Promise<Profile | null> {
    try {
        const csrfToken = await fetchCsrfToken();
        const response = await fetch(`/api/hoagie/profile/update`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(updatedProfile),
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        return null
    } catch (error) {
        console.error('Error updating profile:', error);
    }
}