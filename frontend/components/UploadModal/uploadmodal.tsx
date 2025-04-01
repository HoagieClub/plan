import { useState } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

import { LoadingComponent } from '../LoadingComponent';
import { TutorialModal } from '../Modal';

import styles from './UploadModal.module.css';
import { Profile } from '../../types'

interface Upload {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => Promise<void>;
	profile: Profile;
}

const Upload: React.FC<Upload> = ({ isOpen, onClose, onSuccess, profile }) => {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

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

	const handleSave = async () => {
		if (selectedFiles.length === 0) {
			alert('No files selected');
			return;
		}

		setIsLoading(true);

		const formData = new FormData();
		selectedFiles.forEach((file) => {
			formData.append('file', file);
		});

		try {
			// Log what we're trying to upload for debugging
			console.log(
				'Attempting to upload files:',
				selectedFiles.map((f) => `${f.name} (${f.size} bytes)`)
			);

			const response = await fetch('http://localhost:8000/api/upload/', {
				method: 'POST',
				body: formData,
				headers: {
					Accept: 'application/json',
					'X-NetId': profile.netId,
				},
			});

			// Get both text and status for debugging
			const responseText = await response.text();

			if (!response.ok) {
				// More descriptive error with status code
				throw new Error(`Upload failed with status ${response.status}: ${responseText}`);
			}
			alert('Files uploaded successfully!');
			setSelectedFiles([]);
			await onSuccess();
		} catch (error) {
			console.error('Upload error:', error);
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				alert('Network error: Server may be down or unreachable.');
			} else {
				alert(`Error uploading files: ${error instanceof Error ? error.message : String(error)}`);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const modalContent = (
		<TutorialModal>
			<div className={styles.modal}>
				<div className={styles.header}>
					Upload Transcript
				</div>

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
							<input 
								type='file'
								onChange={handleFileChange}
								accept=".pdf"
								multiple={false}
							/>
							Browse Files
						</label>
					</div>

					{selectedFiles.length > 0 && (
						<div className={styles.fileList}>
							{selectedFiles.map((file, index) => (
								<div key={index} className={styles.fileItem}>
									<span className={styles.fileName}>{file.name}</span>
									<button 
										className={styles.removeButton}
										onClick={() => removeFile(file.name)}
										aria-label="Remove file"
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
							<JoyButton
								variant='soft'
								color='neutral'
								onClick={onClose}
								disabled={isLoading}
							>
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
