'use client';

import { useState } from 'react';

import { Snackbar } from '@mui/joy';

import Upload from './UploadModal';
import styles from './UploadModal.module.css';

import type { Profile } from '../../types';

/** Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useUploadModal(profile: Profile, refreshData: () => Promise<void>) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showNotification, setShowNotification] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const openUploadModal = () => {
		setIsModalOpen(true);
	};

	const handleUploadSuccess = async () => {
		setIsModalOpen(false);
		setNotificationMessage('Transcript uploaded successfully!');
		setIsError(false);
		setShowNotification(true);
		await refreshData();
		setTimeout(() => {
			setShowNotification(false);
		}, 3000);
	};

	const handleUploadError = (error: string) => {
		setNotificationMessage(error);
		setIsError(true);
		setShowNotification(true);
		setTimeout(() => {
			setShowNotification(false);
		}, 3000);
	};

	const uploadModal = isModalOpen ? (
		<Upload
			isOpen={isModalOpen}
			onClose={() => setIsModalOpen(false)}
			onSuccess={handleUploadSuccess}
			onError={handleUploadError}
		/>
	) : null;

	const notification = (
		<Snackbar
			open={showNotification}
			color={isError ? 'danger' : 'primary'}
			variant='soft'
			onClose={() => setShowNotification(false)}
			autoHideDuration={3000}
			className={styles.snackbar}
		>
			<div className={styles.snackbarContent}>{notificationMessage}</div>
		</Snackbar>
	);

	return { openUploadModal, uploadModal, notification };
}
