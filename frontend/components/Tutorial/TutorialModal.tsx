import { type FC, useState, useEffect } from 'react';

import { Button as JoyButton } from '@mui/joy';
import Image from 'next/image';
import { createPortal } from 'react-dom';

import { TutorialModal } from '@/components/Modal';

import styles from './Tutorial.module.css';

interface TutorialProps {
	isOpen: boolean;
	onClose: () => void;
	tutorialType: string;
}

interface TutorialContent {
	headers: string[];
	pages: string[];
	photos: string[];
}

export const Tutorial: FC<TutorialProps> = ({ isOpen, onClose, tutorialType }) => {
	const [content, setContent] = useState<TutorialContent | null>(null);
	const [currentPage, setCurrentPage] = useState(0);

	useEffect(() => {
		if (tutorialType) {
			const fetchTutorialContent = async () => {
				try {
					const response = await fetch(`/${tutorialType}.json`);
					if (!response.ok) {
						throw new Error(`Failed to fetch tutorial content: ${response.statusText}`);
					}
					const data = await response.json();
					setContent(data);
				} catch (err) {
					console.error('Error loading tutorial content:', err);
					// Optionally, we could set an error state here to show to the user
					setContent(null);
				}
			};

			void fetchTutorialContent();
		}
	}, [tutorialType]);

	if (!content) {
		return null;
	}

	const { headers, pages, photos } = content;
	const totalPages = pages.length;

	const handleNext = () => {
		if (currentPage < totalPages - 1) {
			setCurrentPage(currentPage + 1);
		} else {
			onClose();
		}
	};

	const handlePrev = () => {
		if (currentPage > 0) {
			setCurrentPage(currentPage - 1);
		}
	};

	const modalContent = (
		<TutorialModal>
			<div className={styles.modal}>
				<div className={styles.header}>{headers[currentPage]}</div>
				<div className={styles.pageContent}>{pages[currentPage]}</div>
				<div className={styles.pagePhoto}>
					<div style={{ position: 'relative', width: '65%', aspectRatio: '16/9' }}>
						<Image
							src={photos[currentPage]}
							alt={`Step ${currentPage + 1}`}
							fill
							style={{ objectFit: 'contain' }}
							priority={currentPage === 0}
							sizes='(max-width: 768px) 100vw, 65vw'
						/>
					</div>
				</div>
				<div className={styles.footer}>
					<JoyButton variant='soft' color='neutral' onClick={onClose} sx={{ ml: 2 }} size='md'>
						Close
					</JoyButton>
					<div className={styles.pagination}>
						<JoyButton
							variant='solid'
							color='neutral'
							onClick={handlePrev}
							sx={{ ml: 2 }}
							size='md'
							disabled={currentPage === 0}
						>
							Prev
						</JoyButton>
						<span>
							Page {currentPage + 1} of {totalPages}
						</span>
						<JoyButton
							variant='solid'
							color='neutral'
							onClick={handleNext}
							sx={{ ml: 2 }}
							size='md'
						>
							{currentPage < totalPages - 1 ? 'Next' : 'Done'}
						</JoyButton>
					</div>
				</div>
			</div>
		</TutorialModal>
	);

	return isOpen ? createPortal(modalContent, document.body) : null;
};
