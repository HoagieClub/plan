import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';

import { Tooltip } from '@mui/joy';
import { CircularProgress, Rating } from '@mui/material';
import { createPortal } from 'react-dom';

import { ReviewMenu } from '@/components/ReviewMenu';
import { CourseDetailSection } from '@/components/ui/CourseDetailSection';
import { CourseSetup } from '@/components/ui/CourseSetup';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { departmentColors } from '@/utils/departmentColors';
import { distributionAreasInverse } from '@/utils/distributionAreas';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';

const darken = (hex: string, amount: number) => {
	const n = parseInt(hex.slice(1), 16);
	const r = Math.max(0, (n >> 16) - Math.round(amount * 255));
	const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(amount * 255));
	const b = Math.max(0, (n & 0xff) - Math.round(amount * 255));
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

interface InfoComponentPopOverProps {
	value: string;
	children: ReactNode;
}

interface CourseSetupItem {
	class_type: string;
	count: number;
	duration?: number;
}

interface CourseDetails {
	[key: string]: string | number | boolean | null | undefined | CourseSetupItem[];
}

const HOVER_CLOSE_DELAY = 200;
const PANEL_WIDTH = 960;

export const InfoComponentPopOver: FC<InfoComponentPopOverProps> = ({ value, children }) => {
	const dept = value.split(' ')[0];
	const coursenum = value.split(' ')[1];

	const [showPopover, setShowPopover] = useState(false);
	const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
	const [feedbackRating, setFeedbackRating] = useState(0);
	const [showFeedbackGradient, setShowFeedbackGradient] = useState(false);
	const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

	const triggerRef = useRef<HTMLDivElement | null>(null);
	const feedbackScrollRef = useRef<HTMLDivElement>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const courseColor = departmentColors[dept];
	const distShort = String(courseDetails?.['Distribution Area'] ?? '')
		.trim()
		.toUpperCase();
	const distColor = getDistributionColors(distShort);
	const distTitle = distributionAreasInverse[distShort];
	const gradingBasis = String(courseDetails?.['Grading Basis'] ?? '');
	const pdfTag = getPdfTag(gradingBasis);
	const pdfColor = getPdfColor(pdfTag);
	const pdfTitle = pdfTag === 'PDF' ? 'PDF Available' : 'PDF Unavailable';
	const auditTag = getAuditTag(gradingBasis);
	const auditColor = getAuditColor(auditTag);
	const auditTitle = auditTag === 'A' ? 'Audit Available' : 'Audit Unavailable';

	const courseSetup: CourseSetupItem[] = Array.isArray(courseDetails?.course_setup)
		? (courseDetails.course_setup as CourseSetupItem[])
		: [];

	const links = useMemo(() => {
		const registrarValue = courseDetails?.Registrar;
		if (typeof registrarValue !== 'string' || !registrarValue) {
			return { registrar: null, princeton: null };
		}

		try {
			const params = new URL(registrarValue).searchParams;
			const term = params.get('term') ?? '';
			const courseId = params.get('courseid') ?? '';

			return {
				registrar: registrarValue,
				princeton:
					term && courseId ? `https://www.princetoncourses.com/course/${term}${courseId}` : null,
			};
		} catch {
			return { registrar: registrarValue, princeton: null };
		}
	}, [courseDetails]);

	const feedbackInnerRef = (element: HTMLDivElement | null) => {
		if (!element) {
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

		observer.observe(element);
	};

	const clearCloseTimer = () => {
		if (!closeTimerRef.current) {
			return;
		}

		clearTimeout(closeTimerRef.current);
		closeTimerRef.current = null;
	};

	const updatePopoverPosition = () => {
		if (!triggerRef.current) {
			return;
		}

		const rect = triggerRef.current.getBoundingClientRect();
		const viewportPadding = 12;
		const gap = 8;
		const estimatedWidth = Math.min(PANEL_WIDTH, window.innerWidth - viewportPadding * 2);

		let left = rect.right + gap;
		if (left + estimatedWidth > window.innerWidth - viewportPadding) {
			left = Math.max(viewportPadding, rect.left - estimatedWidth - gap);
		}

		const top = Math.max(
			viewportPadding,
			Math.min(rect.top - 18, window.innerHeight - viewportPadding - 560)
		);

		setPopoverPosition({ top, left });
	};

	const openPopover = () => {
		clearCloseTimer();
		updatePopoverPosition();
		setShowPopover(true);
	};

	const closePopoverWithDelay = () => {
		clearCloseTimer();
		closeTimerRef.current = setTimeout(() => {
			setShowPopover(false);
		}, HOVER_CLOSE_DELAY);
	};

	const closePopoverNow = () => {
		clearCloseTimer();
		setShowPopover(false);
	};

	useEffect(() => {
		setCourseDetails(null);
		setFeedbackRating(0);
		setShowFeedbackGradient(false);
	}, [value]);

	useEffect(() => {
		if (!showPopover || !value || courseDetails) {
			return;
		}

		const params = new URLSearchParams({ crosslistings: value });
		void fetch(`/api/hoagie/course/details?${params}`)
			.then((response) => response.json())
			.then((data) => {
				setCourseDetails(data as CourseDetails);
			});
	}, [courseDetails, showPopover, value]);

	useEffect(() => {
		if (!showPopover) {
			return;
		}

		const onWindowChange = () => updatePopoverPosition();
		window.addEventListener('resize', onWindowChange);
		window.addEventListener('scroll', onWindowChange, true);

		return () => {
			window.removeEventListener('resize', onWindowChange);
			window.removeEventListener('scroll', onWindowChange, true);
		};
	}, [showPopover]);

	useEffect(() => {
		return () => clearCloseTimer();
	}, []);

	const popoverContent = showPopover ? (
		<div
			onMouseEnter={openPopover}
			onMouseLeave={closePopoverWithDelay}
			style={{
				position: 'fixed',
				top: `${popoverPosition.top}px`,
				left: `${popoverPosition.left}px`,
				zIndex: 60,
				width: `min(${PANEL_WIDTH}px, calc(100vw - 24px))`,
				maxHeight: '80vh',
				overflowY: 'hidden',
				backgroundColor: '#fff',
				borderRadius: '8px',
				boxShadow: '10px 10px 20px rgba(0, 0, 0, 0.4)',
				padding: '22px',
			}}
		>
			{courseDetails ? (
				<div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
						}}
					>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							<div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
								<div
									style={{
										backgroundColor: courseColor,
										color: 'white',
										padding: '4px 14px',
										borderRadius: '10px',
										fontWeight: 'bold',
										fontSize: '1.3rem',
										width: 'fit-content',
										border: `3px solid ${darken(courseColor, 0.07)}`,
									}}
								>
									{value}
								</div>
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
													fontSize: '1.1rem',
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
													fontSize: '1.1rem',
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
													fontSize: '1.1rem',
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
								<h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600 }}>
									{String(courseDetails['Title'])}
								</h3>
							)}
						</div>
						<div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
							{links.princeton && (
								<ExternalLink href={links.princeton}>
									Princeton
									<br />
									Courses
								</ExternalLink>
							)}
							{links.registrar && (
								<ExternalLink href={links.registrar}>
									Official
									<br />
									Registrar
								</ExternalLink>
							)}
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'stretch',
							gap: '24px',
							marginTop: '8px',
							minHeight: 0,
						}}
					>
						<div
							style={{
								flex: 1,
								minHeight: 0,
								overflowWrap: 'break-word',
								overflowY: 'hidden',
								width: '55%',
							}}
						>
							<div style={{ display: 'flex', gap: '16px' }}>
								<div style={{ flex: 1 }}>
									<SectionTitle label='Instructors' iconSrc='/icons/instructors.svg' />
									<CourseDetailSection>
										<div
											style={{
												fontSize: '0.9rem',
												fontWeight: 600,
												display: 'flex',
												flexDirection: 'column',
											}}
										>
											{typeof courseDetails['Instructors'] === 'string' ? (
												String(courseDetails['Instructors'])
													.split(',')
													.map((name, index, arr) => (
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
								<div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
									{String(courseDetails['Description'] ?? '')}
								</div>
							</CourseDetailSection>
						</div>

						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								padding: '0px 4px 4px 4px',
								width: '45%',
								height: '460px',
								minHeight: '460px',
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
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
									border: '1px solid rgba(205, 215, 225, 1)',
								}}
							>
								<div
									ref={feedbackScrollRef}
									style={{ height: '100%', overflowY: 'auto', minHeight: 0, padding: '12px' }}
									onScroll={() => {
										const element = feedbackScrollRef.current;
										if (!element) {
											return;
										}

										setShowFeedbackGradient(
											element.scrollHeight > element.clientHeight &&
												element.scrollTop + element.clientHeight < element.scrollHeight - 2
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
						padding: '20px 0',
					}}
				>
					<CircularProgress size={30} sx={{ color: '#9e9e9e' }} />
				</div>
			)}
		</div>
	) : null;

	return (
		<>
			<div
				ref={triggerRef}
				onMouseEnter={openPopover}
				onMouseLeave={closePopoverWithDelay}
				onClickCapture={closePopoverNow}
			>
				{children}
			</div>
			{popoverContent && createPortal(popoverContent, document.body)}
		</>
	);
};
