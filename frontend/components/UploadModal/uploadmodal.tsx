/* eslint-disable no-undef */
import { useState, useEffect } from 'react';

import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

import { LoadingComponent } from '../LoadingComponent';
import { TutorialModal } from '../Modal';

import styles from './UploadModal.module.css';

import type { Profile } from '../../types';

interface Upload {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => Promise<void>;
	onError: (error: string) => void;
	profile: Profile;
}

const Upload: React.FC<Upload> = ({ isOpen, onClose, onSuccess, onError, profile }) => {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onClose]);

	const handleSave = async () => {
		if (selectedFiles.length === 0) {
			return;
		}

		setIsLoading(true);

		const formData = new FormData();
		selectedFiles.forEach((file) => {
			formData.append('file', file);
		});

		try {
			const response = await fetch('http://localhost:8000/api/upload/', {
				method: 'POST',
				body: formData,
				headers: {
					Accept: 'application/json',
					'X-NetId': profile.netId,
				},
			});

			const responseText = await response.text();
			let responseData;
			try {
				responseData = JSON.parse(responseText);
			} catch {
				throw new Error('Invalid response from server');
			}

			if (!response.ok) {
				throw new Error(responseData.error || 'Upload failed');
			}

			setSelectedFiles([]);
			await onSuccess();
		} catch (error) {
			console.error('Upload error:', error);
			onError(error instanceof Error ? error.message : 'Upload failed');
		} finally {
			setIsLoading(false);
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setSelectedFiles([...selectedFiles, ...Array.from(event.target.files)]);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);

		const droppedFiles = event.dataTransfer.files;
		if (droppedFiles && droppedFiles.length > 0) {
			setSelectedFiles([...selectedFiles, ...Array.from(droppedFiles)]);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
	};

	const removeFile = (fileName: string) => {
		setSelectedFiles(selectedFiles.filter((file) => file.name !== fileName));
	};

	const modalContent = (
		<TutorialModal>
			<div className={styles.modal}>
				<div className={styles.header}>Upload Transcript</div>

				<div className={styles.content}>
					<div
						className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
					>
						<div className={styles.dropText}>
							<div style={{ display: 'flex', justifyContent: 'center' }}>
								<CloudArrowUpIcon className={styles.uploadIcon} />
							</div>
							<p>Drag and drop your transcript PDF here</p>
							<span>or</span>
						</div>
						<label className={styles.fileInput}>
							<input type='file' onChange={handleFileChange} accept='.pdf' multiple={false} />
							Browse Files
						</label>
					</div>

					{selectedFiles.length > 0 && (
						<div className={styles.fileList}>
							{selectedFiles.map((file, index) => (
								<div key={index} className={styles.fileItem}>
									<span className={styles.fileName}>{file.name}</span>
									{isLoading && <div className={styles.spinner} />}
									<button
										className={styles.removeButton}
										onClick={() => removeFile(file.name)}
										aria-label='Remove file'
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className={styles.footer}>
					{isLoading ? (
						<LoadingComponent />
					) : (
						<>
							<JoyButton
								variant='solid'
								onClick={handleSave}
								disabled={isLoading || selectedFiles.length === 0}
								sx={{ mr: 1, bgcolor: '#0d99ff' }}
							>
								Upload
							</JoyButton>
							<JoyButton variant='soft' color='neutral' onClick={onClose} disabled={isLoading}>
								Cancel
							</JoyButton>
						</>
					)}
				</div>
			</div>
		</TutorialModal>
	);

	return isOpen ? createPortal(modalContent, document.body) : null;
};

export default Upload;
