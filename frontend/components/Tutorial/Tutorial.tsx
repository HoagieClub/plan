'use client';

import { useState } from 'react';

import { Tutorial } from '@/components/Tutorial/TutorialModal';

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

	/**
	 * Opens the tutorial modal with the specified tutorial type.
	 *
	 * @param {string} type - The type of tutorial to display (e.g., "dashboard", "calendar").
	 */
	const openTutorialModal = (type: string) => {
		setTutorialType(type);
		setIsModalOpen(true);
	};

	const tutorialModal = isModalOpen ? (
		<Tutorial
			isOpen={isModalOpen}
			onClose={() => setIsModalOpen(false)}
			tutorialType={tutorialType}
		/>
	) : null;

	return { openTutorialModal, tutorialModal };
}
