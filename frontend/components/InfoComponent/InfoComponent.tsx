import { useEffect, useRef, useState, type FC } from 'react';

import { Button as JoyButton, Tooltip } from '@mui/joy';
import { CircularProgress, Rating } from '@mui/material';
import { createPortal } from 'react-dom';

import { Modal } from '@/components/Modal';
import { ReviewMenu } from '@/components/ReviewMenu';
import { CourseDetailSection } from '@/components/ui/CourseDetailSection';
import { CourseSetup } from '@/components/ui/CourseSetup';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { cn } from '@/lib/utils';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { departmentColors } from '@/utils/departmentColors';
import { distributionAreasInverse } from '@/utils/distributionAreas';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';

import styles from './InfoComponent.module.css';

const darken = (hex: string, amount: number) => {
	const n = parseInt(hex.slice(1), 16);
	const r = Math.max(0, (n >> 16) - Math.round(amount * 255));
	const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(amount * 255));
	const b = Math.max(0, (n & 0xff) - Math.round(amount * 255));
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

interface InfoComponentProps {
	value: string;
}

export const InfoComponent: FC<InfoComponentProps> = ({ value }) => {
	const dept = value.split(' ')[0];
	const coursenum = value.split(' ')[1];
	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [feedbackRating, setFeedbackRating] = useState<number>(0);
	const [courseDetails, setCourseDetails] = useState<{
		// TODO: Address this typing eventually.

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	} | null>(null);

	const modalRef = useRef(null);
	const feedbackScrollRef = useRef<HTMLDivElement>(null);
	const [showFeedbackGradient, setShowFeedbackGradient] = useState(false);

	const feedbackInnerRef = (el: HTMLDivElement | null) => {
		if (!el) {
			return;
		}
		const observer = new ResizeObserver(() => {
			const scroll = feedbackScrollRef.current;
			if (!scroll) {
				return;
			}
			setShowFeedbackGradient(
				scroll.scrollHeight > scroll.clientHeight &&
					scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 2
			);
		});
		observer.observe(el);
	};

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
			void fetch(`/api/hoagie/course/details?${params}`)
				.then((response) => {
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					return response.json();
				})
				.then((data) => {
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

	const modalContent = showPopup ? (
		<Modal>
			<div
				className={styles.modal}
				style={{
					width: '75%',
					height: courseDetails ? '82vh' : '160px',
					gap: '10px',
					padding: '25px',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
				ref={modalRef}
			>
				{courseDetails ? (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							width: '100%',
							flex: 1,
							minHeight: 0,
							overflowX: 'hidden',
							overflowY: 'auto',
						}}
					>
						{/* Full-width header row: course code + title on left, links on right */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
							}}
						>
							{/* Left: course code badge + tags, then title */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
								{/* Row: badge + tags */}
								<div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
									<div
										style={{
											backgroundColor: courseColor,
											color: 'white',
											padding: '4px 14px',
											borderRadius: '10px',
											fontWeight: 'bold',
											fontSize: '1.4rem',
											width: 'fit-content',
											border: `3px solid ${darken(courseColor, 0.07)}`,
										}}
									>
										{value}
									</div>
									{/* Tags Row */}
									<div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
										{distShort && (
											<Tooltip title={distTitle} variant='soft'>
												<div
													style={{
														backgroundColor: distColor,
														color: 'white',
														padding: '0 14px',
														borderRadius: '10px',
														fontWeight: '600',
														fontSize: '1.2rem',
														width: 'fit-content',
														display: 'flex',
														alignItems: 'center',
													}}
												>
													{distShort}
												</div>
											</Tooltip>
										)}
										{pdfTag && (
											<Tooltip title={pdfTitle} variant='soft'>
												<div
													style={{
														backgroundColor: pdfColor,
														color: 'white',
														padding: '0 14px',
														borderRadius: '10px',
														fontWeight: '600',
														fontSize: '1.2rem',
														width: 'fit-content',
														display: 'flex',
														alignItems: 'center',
													}}
												>
													{pdfTag}
												</div>
											</Tooltip>
										)}
										{auditTag && (
											<Tooltip title={auditTitle} variant='soft'>
												<div
													style={{
														backgroundColor: auditColor,
														color: 'white',
														padding: '0 14px',
														borderRadius: '10px',
														fontWeight: '600',
														fontSize: '1.2rem',
														width: 'fit-content',
														display: 'flex',
														alignItems: 'center',
													}}
												>
													{auditTag}
												</div>
											</Tooltip>
										)}
									</div>
								</div>
								{courseDetails['Title'] && (
									<h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>
										{courseDetails['Title']}
									</h2>
								)}
							</div>

							{/* Right: Registrar & Princeton Courses buttons */}
							<div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
								<ExternalLink
									href={`https://www.princetoncourses.com/course/${
										new URL(courseDetails.Registrar).searchParams.get('term') +
										new URL(courseDetails.Registrar).searchParams.get('courseid')
									}`}
								>
									Princeton
									<br />
									Courses
								</ExternalLink>
								{courseDetails?.Registrar && (
									<ExternalLink href={courseDetails.Registrar}>
										Official
										<br />
										Registrar
									</ExternalLink>
								)}
							</div>
						</div>

						{/* Two-column body */}
						<div
							style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, gap: '24px' }}
						>
							{/* Details section with explicit width */}
							<div
								style={{
									flex: 1,
									minHeight: 0,
									overflowWrap: 'break-word',
									flexWrap: 'wrap',
									overflowY: 'auto',
									width: '55%',
								}}
							>
								<div style={{ display: 'flex', gap: '16px' }}>
									<div style={{ flex: 1 }}>
										<SectionTitle label='Instructors' iconSrc='/icons/instructors.svg' />
										<CourseDetailSection>
											<div
												style={{
													fontSize: '0.85rem',
													fontWeight: 500,
													display: 'flex',
													flexDirection: 'column',
												}}
											>
												{typeof courseDetails?.Instructors === 'string' ? (
													courseDetails.Instructors.split(',').map((name, index, arr) => (
														<div
															key={index}
															style={{
																paddingBottom: index !== arr.length - 1 ? '5px' : '0px',
																marginBottom: index !== arr.length - 1 ? '5px' : '0px',
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
										</CourseDetailSection>
									</div>
									<div style={{ flex: 1 }}>
										<SectionTitle label='Course Setup' iconSrc='/icons/course-setup.svg' />
										<CourseDetailSection>
											<CourseSetup courseSetup={courseSetup} />
										</CourseDetailSection>
									</div>
								</div>

								<SectionTitle label='Description' iconSrc='/icons/description.svg' />
								<CourseDetailSection>
									<div style={{ fontSize: '0.85rem' }}>{courseDetails['Description']}</div>
								</CourseDetailSection>

								{/* Grading */}
								{Array.isArray(courseDetails['Grading']) && courseDetails['Grading'].length > 0 && (
									<div>
										<SectionTitle label='Grading' iconSrc='/icons/description.svg' />
										<CourseDetailSection>
											<div
												style={{
													fontSize: '0.85rem',
													fontWeight: 500,
													display: 'flex',
													flexDirection: 'column',
												}}
											>
												{(
													courseDetails['Grading'] as unknown as {
														label: string;
														percent: number;
													}[]
												).slice().sort((a, b) => b.percent - a.percent).map(({ label, percent }, index, arr) => (
													<div
														key={label}
														style={{
															paddingBottom: index !== arr.length - 1 ? '5px' : '0px',
															marginBottom: index !== arr.length - 1 ? '5px' : '0px',
															borderBottom: index !== arr.length - 1 ? '1px solid #ccc' : 'none',
														}}
													>
														{percent}% {label}
													</div>
												))}
											</div>
										</CourseDetailSection>
									</div>
								)}
							</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									padding: '0px 8px 8px 10px',
									width: '45%',
									minHeight: 0,
								}}
							>
								<div
									style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
								>
									<SectionTitle label='Student Feedback' iconSrc='/icons/feedback.svg' />
									{feedbackRating > 0 && (
										<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											<span style={{ fontSize: '0.75rem', color: '#8b8b8b', fontWeight: 600 }}>
												{feedbackRating.toFixed(1)}
											</span>
											<Rating value={feedbackRating} precision={0.1} readOnly size='small' />
										</div>
									)}
								</div>
								<div
									style={{
										position: 'relative',
										flex: 1,
										minHeight: 0,
										backgroundColor: '#F5F5F5',
										borderRadius: '6px',
									}}
								>
									<div
										ref={feedbackScrollRef}
										style={{ height: '100%', overflowY: 'auto', minHeight: 0, padding: '12px' }}
										onScroll={() => {
											const el = feedbackScrollRef.current;
											if (!el) {
												return;
											}
											setShowFeedbackGradient(
												el.scrollHeight > el.clientHeight &&
													el.scrollTop + el.clientHeight < el.scrollHeight - 2
											);
										}}
									>
										<div ref={feedbackInnerRef}>
											<ReviewMenu
												dept={dept}
												coursenum={coursenum}
												onRatingLoaded={setFeedbackRating}
											/>
										</div>
									</div>
									<div
										style={{
											position: 'absolute',
											bottom: 0,
											left: 0,
											right: 0,
											height: '30px',
											background: 'linear-gradient(to bottom, transparent, #BFBFBF)',
											pointerEvents: 'none',
											borderRadius: '0 0 6px 6px',
											opacity: showFeedbackGradient ? 1 : 0,
											transition: 'opacity 0.2s ease',
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							width: '100%',
							flex: 1,
						}}
					>
						<CircularProgress size={35} sx={{ color: '#9e9e9e' }} />
					</div>
				)}
				<footer className='mt-auto text-right'>
					<JoyButton variant='soft' color='neutral' onClick={handleCancel} sx={{ ml: 2 }} size='md'>
						Close
					</JoyButton>
				</footer>
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
