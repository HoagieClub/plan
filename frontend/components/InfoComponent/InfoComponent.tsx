import { useEffect, useRef, useState, type FC } from 'react';

import { People, CalendarToday, Menu } from '@mui/icons-material';
import { Button as JoyButton, Tooltip } from '@mui/joy';
import { createPortal } from 'react-dom';

import { LoadingComponent } from '@/components/LoadingComponent';
import { Modal } from '@/components/Modal';
import { ReviewMenu } from '@/components/ReviewMenu';
import OpenInNewTabIcon from '@/components/ui/OpenInNewTabIcon';
import { cn } from '@/lib/utils';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { departmentColors } from '@/utils/departmentColors';
import { distributionAreasInverse } from '@/utils/distributionAreas';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';
import { getSectionColor } from '@/utils/sectionColors';

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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	} | null>(null);

	const modalRef = useRef(null);
	const courseColor = departmentColors[dept];

	const distShort = (courseDetails?.['Distribution Area'] || '').trim().toUpperCase();
	const distColor = getDistributionColors(distShort);
	const distTitle = distributionAreasInverse[distShort];

	const gradingBasis = courseDetails?.['Grading Basis'];
	const pdfTag = getPdfTag(gradingBasis);
	const pdfColor = getPdfColor(pdfTag);
	const pdfTitle = pdfTag === 'PDF' ? 'PDF Available' : 'PDF Unavailable';
	const auditTag = getAuditTag(gradingBasis);
	const auditColor = getAuditColor(auditTag);
	const auditTitle = auditTag === 'A' ? 'Audit Available' : 'Audit Unavailable';

	// Use course_setup from API response
	const courseSetup = courseDetails?.course_setup || [];

	useEffect(() => {
		if (showPopup && value) {
			const params = new URLSearchParams({ crosslistings: value });
			console.log('Fetching course details for:', value);
			void fetch(`/api/hoagie/course/details/?${params}`)
				.then((response) => {
					console.log('Response status:', response.status);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					return response.json();
				})
				.then((data) => {
					console.log('Course details received:', data);
					setCourseDetails(data);
				})
				.catch((error) => {
					console.error('Error fetching course details:', error);
					setCourseDetails({ error: 'Failed to load course details' });
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
		color: 'gray',
		display: 'block',
		fontWeight: 500,
		fontSize: '0.9rem',
		marginTop: '8px',
		marginBottom: '3px',
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
						{/* Details section with explicit width */}
						<div
							style={{
								height: '100%',
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
										padding: '8px 14px',
										borderRadius: '10px',
										fontWeight: 'bold',
										fontSize: '1.1rem',
										width: 'fit-content',
									}}
								>
									{value}
								</div>

								{/* Buttons for Registrar & Princeton Courses */}
								<div style={{ display: 'flex', gap: '6px' }}>
									{courseDetails?.Registrar && (
										<JoyButton
											variant='soft'
											color='neutral'
											component='a'
											href={courseDetails.Registrar}
											target='_blank'
											rel='noopener noreferrer'
											sx={{ ml: 2 }}
											size='md'
										>
											Registrar
											<OpenInNewTabIcon className='h-4 w-6' aria-hidden='true' />
										</JoyButton>
									)}
									{courseDetails?.Registrar &&
										(() => {
											try {
												const registrarUrl = new URL(courseDetails.Registrar);
												const term = registrarUrl.searchParams.get('term');
												const courseid = registrarUrl.searchParams.get('courseid');
												if (term && courseid) {
													return (
														<JoyButton
															variant='soft'
															color='neutral'
															component='a'
															href={`https://www.princetoncourses.com/course/${term}${courseid}`}
															target='_blank'
															rel='noopener noreferrer'
															sx={{ ml: 2 }}
															size='md'
														>
															Princeton Courses
															<OpenInNewTabIcon className='h-4 w-6' aria-hidden='true' />
														</JoyButton>
													);
												}
											} catch (e) {
												console.error('Failed to construct Princeton Courses URL:', e);
											}
											return null;
										})()}
								</div>
							</div>

							{/* Course Title */}
							{courseDetails['Title'] && (
								<h2 style={{ fontSize: '1.15rem', fontWeight: 550, margin: '6px 8px 8px 0px' }}>
									{courseDetails['Title']}
								</h2>
							)}

							{/* Tags Row */}
							<div style={{ display: 'flex', gap: '10px' }}>
								{/* Distribution Area Code */}
								{distShort && (
									<Tooltip title={distTitle} variant='soft'>
										<div
											style={{
												backgroundColor: distColor,
												color: 'white',
												padding: '4px 8px 4px 8px',
												borderRadius: '10px',
												fontWeight: 'bold',
												width: 'fit-content',
											}}
										>
											{distShort}
										</div>
									</Tooltip>
								)}

								{/* PDF Tag Code */}
								{pdfTag && (
									<Tooltip title={pdfTitle} variant='soft'>
										<div
											style={{
												backgroundColor: pdfColor,
												color: 'white',
												padding: '4px 8px 4px 8px',
												borderRadius: '7px',
												fontWeight: 'bold',
												width: 'fit-content',
											}}
										>
											{pdfTag}
										</div>
									</Tooltip>
								)}

								{/* Audit Tag */}
								{auditTag && (
									<Tooltip title={auditTitle} variant='soft'>
										<div
											style={{
												backgroundColor: auditColor,
												color: 'white',
												padding: '4px 8px 4px 8px',
												borderRadius: '7px',
												fontWeight: 'bold',
												width: 'fit-content',
											}}
										>
											{auditTag}
										</div>
									</Tooltip>
								)}
							</div>

							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '16px',
									marginTop: '16px',
								}}
							>
								{/* Instructors Section */}
								<div>
									<strong style={modalTitleStyle}>
										<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
											<People fontSize='small' />
											Instructors
										</span>
									</strong>
									<div
										style={{
											backgroundColor: '#f5f5f5',
											padding: '6px 16px',
											borderRadius: '6px',
											fontSize: '0.85rem',
											fontWeight: 500,
											display: 'flex',
											flexDirection: 'column',
										}}
									>
										{typeof courseDetails?.Instructors === 'string' && courseDetails.Instructors ? (
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
											<div style={{ color: '#999', fontStyle: 'italic' }}>No instructor listed</div>
										)}
									</div>
								</div>

								{/* Course Setup Section */}
								<div>
									<strong style={modalTitleStyle}>
										<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
											<CalendarToday fontSize='small' />
											Course Setup
										</span>
									</strong>
									<div
										style={{
											backgroundColor: '#f5f5f5',
											padding: '6px 16px',
											borderRadius: '6px',
											fontSize: '0.85rem',
										}}
									>
										{courseSetup.length > 0 ? (
											<>
												<div
													style={{
														marginBottom: '8px',
														fontWeight: 600,
														color: '#333',
														fontSize: '0.85rem',
														paddingBottom: '8px',
														borderBottom: '1px solid #e0e0e0',
													}}
												>
													{courseSetup.map((item, idx) => (
														<span key={item.class_type}>
															{item.count} {item.class_type}
															{item.count > 1 ? 's' : ''}
															{idx < courseSetup.length - 1 ? ', ' : ''}
														</span>
													))}
												</div>
												<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
													{courseSetup.map((item) => {
														const config =
															getSectionColor[item.class_type] || getSectionColor['Unknown'];
														return (
															<div
																key={item.class_type}
																style={{
																	borderRadius: '6px',
																	textAlign: 'center',
																	fontWeight: 600,
																	flex: '1',
																	overflow: 'hidden',
																}}
															>
																<div
																	style={{
																		backgroundColor: config.color,
																		color: 'white',
																		fontSize: '0.9rem',
																		fontWeight: 'bold',
																		padding: '4px 0',
																	}}
																>
																	{config.abbr}
																</div>
																<div
																	style={{
																		backgroundColor: config.lightColor ?? config.color + '99',
																		color: 'white',
																		fontSize: '0.75rem',
																		padding: '3px 0',
																	}}
																>
																	{item.duration} m.
																</div>
															</div>
														);
													})}
												</div>
											</>
										) : (
											<div style={{ color: '#999', fontStyle: 'italic', padding: '8px 0' }}>
												No section information available
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Description Box */}
							<strong style={modalTitleStyle}>
								<Menu fontSize='small' />
								Description
							</strong>
							<div
								style={{
									backgroundColor: '#f5f5f5',
									padding: '8px 10px',
									borderRadius: '6px',
									fontSize: '0.85rem',
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
							<ReviewMenu dept={dept} coursenum={coursenum} />
						</div>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							width: '90%',
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
					display: 'block',
					cursor: 'pointer',
					maxWidth: '100%',
					overflow: 'hidden',
					whiteSpace: 'nowrap',
					textOverflow: 'ellipsis',
				}}
				className={cn(styles.Action)}
			>
				{value}
			</div>
			{modalContent && createPortal(modalContent, document.body)}
		</>
	);
};
