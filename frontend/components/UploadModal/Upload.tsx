'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Snackbar } from '@mui/joy';

import Upload from './uploadmodal';
import { Profile } from '../../types'
import styles from './UploadModal.module.css';

/** Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useUploadModal(profile: Profile, refreshData: () => Promise<void>) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showNotification, setShowNotification] = useState(false);

	const openUploadModal = () => {
		setIsModalOpen(true);
	};

	const handleUploadSuccess = async () => {
		setIsModalOpen(false);
		setShowNotification(true);
		// Refresh the data after successful upload
		await refreshData();
		setTimeout(() => {
			setShowNotification(false);
		}, 3000);
	};

	const uploadModal = isModalOpen ? (
		<Upload 
			isOpen={isModalOpen} 
			onClose={() => setIsModalOpen(false)} 
			onSuccess={handleUploadSuccess}
			profile={profile}
		/>
	) : null;

	const notification = (
		<Snackbar
			open={showNotification}
			color='primary'
			variant='soft'
			onClose={() => setShowNotification(false)}
			autoHideDuration={3000}
			className={styles.snackbar}
		>
			<div className={styles.snackbarContent}>
				Files uploaded successfully!
			</div>
		</Snackbar>
	);

	return { openUploadModal, uploadModal, notification };
}
