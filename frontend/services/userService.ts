import type { Profile } from '@/types';

const GET_USER_URL = '/api/hoagie/profile/get_user';
const UPDATE_PROFILE_URL = '/api/hoagie/profile/update';

// Fetch user profile from the backend
export async function fetchCustomUser(): Promise<Profile | null> {
	try {
		const response = await fetch(GET_USER_URL);

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
export async function updateUserProfile(updatedProfile: Profile): Promise<Profile | null> {
	try {
		const response = await fetch(UPDATE_PROFILE_URL, {
			method: 'POST',
			body: JSON.stringify(updatedProfile),
		});

		if (!response.ok) {
			throw new Error('Failed to update profile');
		}
		return null;
	} catch (error) {
		console.error('Error updating profile:', error);
	}
}
