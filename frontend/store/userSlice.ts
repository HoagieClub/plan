'use client';

import { useEffect } from 'react';

import { type User } from '@auth0/nextjs-auth0/types';
import { create } from 'zustand';

import type { Profile, MajorMinorType, UserState } from '@/types';
import { fetchCustomUser } from '@/services/userService';
import { fetchCsrfToken } from '@/utils/csrf';

// Utility function: Map Auth0 user profile to app's Profile type
async function mapUserProfileToProfile(userProfile: User): Promise<Profile> {
	if (!userProfile) {
		throw new Error('UserProfile is null or undefined.');
	}

	const [firstName = '', lastName = ''] = (userProfile.name || '').split(' ');
	const netId = userProfile.nickname || '';
	const email = userProfile.sub.split('|')[2] || '';

	const defaultMajor: MajorMinorType = {
		code: 'Undeclared',
		name: 'Undeclared',
	};

	const user = await fetchCustomUser(netId, firstName, lastName, email);

	return {
		firstName: user.firstName || firstName,
		lastName: user.lastName || lastName,
		classYear: user.classYear || new Date().getFullYear() + 1,
		major: user.major || defaultMajor,
		minors: user.minors || [],
		certificates: user.certificates || [],
		netId: user.netId || netId,
		universityId: user.universityId || '',
		email: user.email || email,
		department: user.department || 'Undeclared',
		timeFormat24h: user.timeFormat24h || false,
		themeDarkMode: user.themeDarkMode || false,
	};
}

const useUserSlice = create<UserState>((set) => ({
	profile: {
		firstName: '',
		lastName: '',
		major: undefined,
		minors: [],
		certificates: [],
		classYear: undefined,
		netId: '',
		universityId: '',
		email: '',
		department: '',
		themeDarkMode: false,
		timeFormat24h: false,
	},
	academicPlan: {},
	updateProfile: (updates: Partial<Profile>) =>
		set((state) => ({ profile: { ...state.profile, ...updates } })),
	setAcademicPlan: (plan: Record<string, any>) => set(() => ({ academicPlan: plan })),
	updateRequirements: async () => {
		try {
			const response = await fetch(`/api/hoagie/update_requirements`, {
				cache: 'no-store',
			});
			const data = await response.json();
			set({ academicPlan: data }); // sets academicPlan in the store
			return data;
		} catch (error) {
			console.error('Failed to update requirements:', error);
			return null;
		}
	},
	fetchAndUpdateProfile: async (userProfile) => {
		if (!userProfile) {
			console.warn('fetchAndUpdateProfile called with undefined userProfile.');
			return;
		}

		try {
			const profile = await mapUserProfileToProfile(userProfile);
			set(() => ({ profile }));
		} catch (error) {
			console.error('Failed to fetch and update user profile:', error);
		}
	},
}));

export const useFetchUserProfile = (userProfile) => {
	const fetchAndUpdateProfile = useUserSlice((state) => state.fetchAndUpdateProfile);

	useEffect(() => {
		if (userProfile) {
			fetchAndUpdateProfile(userProfile);
		}
	}, [userProfile, fetchAndUpdateProfile]);
};

export default useUserSlice;
