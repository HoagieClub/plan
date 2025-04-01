'use client';

import { useState } from 'react';

import Upload from './uploadmodal';
import { Profile } from '../../types'

/** Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useUploadModal(profile: Profile, refreshData: () => Promise<void>) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const openUploadModal = () => {
		setIsModalOpen(true);
	};

	const handleUploadSuccess = async () => {
		setIsModalOpen(false);
		// Refresh the data after successful upload
		await refreshData();
	};

	const uploadModal = isModalOpen ? (
		<Upload 
			isOpen={isModalOpen} 
			onClose={() => setIsModalOpen(false)} 
			onSuccess={handleUploadSuccess}
			profile={profile}
		/>
	) : null;

	return { openUploadModal, uploadModal };
}
