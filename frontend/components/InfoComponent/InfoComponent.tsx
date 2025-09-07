import { type FC } from 'react';
import { useState, useEffect, useRef } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

import { LoadingComponent } from '@/components/LoadingComponent';
import { Modal } from '@/components/Modal';
import { ReviewMenu } from '@/components/ReviewMenu';
import { cn } from '@/lib/utils';
import { departmentColors } from '@/utils/departmentColors';
import { distributionColors } from '@/utils/distributionColors';

import styles from './InfoComponent.module.css';

interface InfoComponentProps {
	value: string;
}

export const InfoComponent: FC<InfoComponentProps> = ({ value }) => {
	const dept = value.split(' ')[0];
	const coursenum = value.split(' ')[1];
	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [courseDetails, setCourseDetails] = useState<{
		// TODO: Address this typing eventually.

		[key: string]: any;
	} | null>(null);

	const modalRef = useRef(null);
	const courseColor = departmentColors[dept];

	const distShort = (courseDetails?.['Distribution Area'] || '').trim().toUpperCase();
	const distColor = distributionColors[distShort];

	useEffect(() => {
		if (showPopup && value) {
			const url = new URL(`${process.env.BACKEND}/course/details/`);
			url.searchParams.append('crosslistings', value);

			void fetch(url.toString(), {
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
				.then((response) => response.json())
				.then((data) => {
					setCourseDetails(data);
				});
		}
	}, [showPopup, value]);

	const handleOutsideClick = (event) => {
		if (modalRef.current && !modalRef.current.contains(event.target)) {
			handleCancel(event);
		}
	};

	const handleKeyDown = (event) => {
		if (event.key === 'Escape' || event.key === 'Enter') {
			handleCancel(event);
		}
	};

	const handleClick = (event) => {
		event.stopPropagation();
		setShowPopup(true);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('mousedown', handleOutsideClick);
	};

	const handleCancel = (event) => {
		event.preventDefault();
		event.stopPropagation();
		setShowPopup(false);
		document.removeEventListener('keydown', handleKeyDown);
		document.removeEventListener('mousedown', handleOutsideClick);
	};

	const modalTitleStyle = {
		color: '#333',
		display: 'block',
		fontWeight: 600,
		fontSize: '0.95rem',
		marginTop: '10px',
		marginBottom: '6px',
	};

	const modalContent = showPopup ? (
		<Modal>
			<div
				className={styles.modal}
				style={{
					width: '85%',
					height: '75%',
					gap: '10px',
					padding: '25px',
					display: 'flex',
					justifyContent: 'flex-end',
				}}
				ref={modalRef}
			>
				{/* Ensure full width */}
				{courseDetails ? (
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							width: '100vw',
							overflowX: 'auto',
							overflowY: 'auto',
						}}
					>
						{' '}
						{/* Full width and row direction */}
						{/* Details section with explicit width */}
						<div
							style={{
								height: '485px',
								overflowWrap: 'break-word',
								flexWrap: 'wrap',
								overflowY: 'auto',
								width: '55%',
								paddingLeft: '10px',
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: '16px',
									marginBottom: '12px',
								}}
							>
								{/* Course code box */}
								<div
									style={{
										backgroundColor: courseColor,
										color: 'white',
										padding: '6px 12px',
										borderRadius: '4px',
										fontWeight: 'bold',
										width: 'fit-content',
									}}
								>
									{value}
								</div>

								{/* Buttons for Registrar & Princeton Courses */}
								<div style={{ display: 'flex', gap: '8px' }}>
									{courseDetails?.Registrar && (
										<a
											href={courseDetails.Registrar}
											target='_blank'
											style={{
												backgroundColor: '#f0f0f0',
												padding: '8px 12px',
												borderRadius: '8px',
												fontWeight: 600,
												color: '#333',
												display: 'block',
											}}
										>
											Registrar
										</a>
									)}

									<a
										href={`https://www.princetoncourses.com/course/${
											new URL(courseDetails.Registrar).searchParams.get('term') +
											new URL(courseDetails.Registrar).searchParams.get('courseid')
										}`}
										target='_blank'
										style={{
											backgroundColor: '#f0f0f0',
											padding: '8px 12px',
											borderRadius: '8px',
											fontWeight: 600,
											color: '#333',
											display: 'block',
										}}
									>
										Princeton Courses
									</a>
								</div>
							</div>

							{/* Distribution Area Code */}
							{distShort && (
								<div
									style={{
										backgroundColor: distColor,
										color: 'white',
										padding: '6px 12px',
										borderRadius: '6px',
										fontWeight: 'bold',
										width: 'fit-content',
									}}
								>
									{distShort}
								</div>
							)}
							{/* Course Title */}
							{courseDetails['Title'] && (
								<h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '10px 10px 10px 0px' }}>
									{courseDetails['Title']}
								</h2>
							)}

							{/* Instructor Names */}
							<strong style={modalTitleStyle}>Instructors</strong>

							{/* Instructors Box */}
							<div
								style={{
									backgroundColor: '#f5f5f5',
									padding: '6px 12px',
									borderRadius: '6px',
									display: 'flex',
									width: 'fit-content',
									flexDirection: 'column',
								}}
							>
								{typeof courseDetails?.Instructors === 'string' ? (
									courseDetails.Instructors.split(',').map((name, index, arr) => (
										<div
											key={index}
											style={{
												padding: '6px 0px',
												borderBottom: index !== arr.length - 1 ? '1px solid #ccc' : 'none',
											}}
										>
											{name.trim()}
										</div>
									))
								) : (
									<div>No instructor listed</div>
								)}
							</div>
							{/* Description Box */}

							<strong style={modalTitleStyle}>Description</strong>

							<div
								style={{
									backgroundColor: '#f5f5f5',
									padding: '8px 10px',
									borderRadius: '6px',
									display: 'flex',
									height: 'fit-content',
									flexDirection: 'column',
								}}
							>
								{courseDetails['Description']}
							</div>
						</div>
						{/* ReviewMenu with explicit width */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-end',
								padding: '0px 8px 8px 10px',
								height: 'auto',
							}}
						>
							{' '}
							{/* Half width */}
							<ReviewMenu dept={dept} coursenum={coursenum} />
						</div>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							width: '100%',
						}}
					>
						<LoadingComponent />
					</div>
				)}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						marginBottom: '15px',
					}}
				>
					<footer className='mt-auto text-right'>
						<JoyButton
							variant='soft'
							color='neutral'
							onClick={handleCancel}
							sx={{ ml: 2 }}
							size='md'
						>
							Close
						</JoyButton>
					</footer>
				</div>
			</div>
		</Modal>
	) : null;

	return (
		<>
			<div
				onClick={handleClick}
				style={{
					position: 'relative',
					display: 'block', // changed from inline-block to block
					cursor: 'pointer',
					maxWidth: '100%', // ensure it respects the container's max width
					overflow: 'hidden', // ensure overflow is hidden
					whiteSpace: 'nowrap', // no wrap
					textOverflow: 'ellipsis', // apply ellipsis
				}}
				className={cn(styles.Action)}
			>
				{value}
			</div>
			{modalContent && createPortal(modalContent, document.body)}
		</>
	);
};
