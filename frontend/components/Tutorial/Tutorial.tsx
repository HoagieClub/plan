'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { Tutorial } from '@/components/Tutorial/TutorialModal';
import useUserSlice from '@/store/userSlice';
import { fetchCsrfToken } from '@/utils/csrf';

/**
 * Custom hook that manages the state and logic for the tutorial modal.
 *
 * This hook provides a function to open the tutorial modal with a specific tutorial type
 * and returns the modal component which can be conditionally rendered.
 *
 * @example
 * const { openTutorialModal, tutorialModal } = useTutorialModal();
 * // To open the modal with the "dashboard" tutorial:
 * openTutorialModal('dashboard');
 *
 * @returns {{openTutorialModal: (type: string) => void, tutorialModal: JSX.Element | null}}
 * An object containing:
 *   - openTutorialModal: A function that accepts a tutorial type (string) and opens the modal.
 *   - tutorialModal: The JSX element representing the tutorial modal if open; otherwise, null.
 */
export function useTutorialModal() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [tutorialType, setTutorialType] = useState<string>('dashboard');
	const profile = useUserSlice((state) => state.profile);
	const pathname = usePathname();

	const [csrfToken, setCsrfToken] = useState('');
	useEffect(() => {
		void (async () => {
			const token = await fetchCsrfToken();
			setCsrfToken(token);
		})();
	}, []);

	useEffect(() => {
		if (pathname !== '/dashboard') {
			return;
		}

		if (!profile || !profile.netId) {
			return;
		}

		async function fetchTutorialStatus() {
			try {
				const response = await fetch(`/api/hoagie/tutorial/get-status/`);
				const data = await response.json();
				if (data.hasSeenTutorial === false) {
					setIsModalOpen(true);
				}
			} catch (error) {
				console.error('Error fetching tutorial status:', error);
			}
		}
		void fetchTutorialStatus();
	}, [profile, pathname]);

	/**
	 * Opens the tutorial modal with the specified tutorial type.
	 *
	 * @param {string} type - The type of tutorial to display (e.g., "dashboard", "calendar").
	 */
	const openTutorialModal = (type: string) => {
		setTutorialType(type);
		setIsModalOpen(true);
	};

	const finishTutorial = async () => {
		try {
			await fetch(`/api/hoagie/tutorial/set-status/`, {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrfToken,
				},
			});
			setIsModalOpen(false);
		} catch (error) {
			console.error('Error updating tutorial status:', error);
		}
	};

	const tutorialModal = isModalOpen ? (
		<Tutorial isOpen={isModalOpen} onClose={finishTutorial} tutorialType={tutorialType} />
	) : null;

	return { openTutorialModal, tutorialModal };
}
