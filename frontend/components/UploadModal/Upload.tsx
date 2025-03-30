'use client';

import { useState } from 'react';

import Upload from './uploadmodal';
import { Profile } from '../../types'

/** Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useUploadModal(profile: Profile) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const openUploadModal = () => {
		setIsModalOpen(true);
	};

	const uploadModal = isModalOpen ? (
		<Upload isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} profile = { profile }/>
	) : null;

	return { openUploadModal, uploadModal };
}
