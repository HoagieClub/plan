import { useState } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

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

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setSelectedFiles([...selectedFiles, ...Array.from(event.target.files)]);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();

		const droppedFiles = event.dataTransfer.files;
		if (droppedFiles && droppedFiles.length > 0) {
			setSelectedFiles([...selectedFiles, ...Array.from(droppedFiles)]);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
	};

	const removeFile = (fileName: string) => {
		setSelectedFiles(selectedFiles.filter((file) => file.name !== fileName));
	};

	const [isLoading, setIsLoading] = useState(false);

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
			console.log('Response Status:', response.status);
			console.log('Response Headers:', response.headers);
			console.log('Response Body:', responseText);

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
				<div className={styles.header}>Load file(s)</div>

				<div className={styles.fileInputContainer}>
					<label>
						<input type='file' multiple onChange={handleFileChange} />
					</label>
				</div>

				<div className={styles.dropZone} onDrop={handleDrop} onDragOver={handleDragOver}>
					Drop files here
				</div>

				{selectedFiles.length > 0 && (
					<div className={styles.fileContainer}>
						{selectedFiles.map((file, index) => (
							<div key={index}>
								<span>{file.name}</span>
								<button className={styles.closeButton} onClick={() => removeFile(file.name)}>
									X
								</button>
							</div>
						))}
					</div>
				)}

				<div className={styles.footer} style = {{ marginTop: '16px' }}>
					{isLoading ? (
						<LoadingComponent />
					) : (
						<>
							<JoyButton
								variant='soft'
								color='neutral'
								onClick={handleSave}
								sx={{ ml: 2 }}
								size='md'
								disabled={isLoading}
							>
								Save
							</JoyButton>
							<JoyButton
								variant='soft'
								color='neutral'
								onClick={onClose}
								sx={{ ml: 2 }}
								size='md'
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
