import React, { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';

import { Tooltip } from '@mui/joy';
import { CircularProgress, Rating } from '@mui/material';
import { createPortal } from 'react-dom';

import { ReviewMenu } from '@/components/ReviewMenu';
import { CourseDetailSection } from '@/components/ui/CourseDetailSection';
import { CourseSetup } from '@/components/ui/CourseSetup';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { getDepartmentGradient } from '@/utils/departmentColors';
import { distributionAreasInverse } from '@/utils/distributionAreas';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';

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

const PANEL_WIDTH = 560;

export const InfoComponentPopOver: FC<InfoComponentPopOverProps> = ({ value, children }) => {
	const dept = value.split(' ')[0];
	const coursenum = value.split(' ')[1];

	const [showPopover, setShowPopover] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
	const [feedbackRating, setFeedbackRating] = useState(0);
	const [showScrollGradient, setShowScrollGradient] = useState(false);
	const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

	const instanceId = useRef(Math.random());
	const triggerRef = useRef<HTMLDivElement | null>(null);
	const popoverScrollRef = useRef<HTMLDivElement>(null);

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

	const checkScrollGradient = () => {
		const el = popoverScrollRef.current;
		if (!el) {
			return;
		}
		setShowScrollGradient(
			el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 2
		);
	};

	const updatePopoverPosition = () => {
		if (!triggerRef.current) {
			return;
		}

		const rect = triggerRef.current.getBoundingClientRect();
		const containerRect = (
			triggerRef.current.closest('li') ?? triggerRef.current
		).getBoundingClientRect();
		const viewportPadding = 20;
		const gap = 8;
		const estimatedWidth = Math.min(PANEL_WIDTH, window.innerWidth - viewportPadding * 2);
		const estimatedHeight = 560;

		let left = containerRect.right + gap;
		if (left + estimatedWidth > window.innerWidth - viewportPadding) {
			left = Math.max(viewportPadding, containerRect.left - estimatedWidth - gap);
		}

		const idealTop = rect.top + rect.height / 2 - estimatedHeight / 2;
		const top = Math.max(
			viewportPadding,
			Math.min(idealTop, window.innerHeight - viewportPadding - estimatedHeight)
		);

		setPopoverPosition({ top, left });
	};

	const togglePopover = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (showPopover) {
			setIsVisible(false);
			setTimeout(() => setShowPopover(false), 150);
		} else {
			updatePopoverPosition();
			setShowPopover(true);
			requestAnimationFrame(() => setIsVisible(true));
			window.dispatchEvent(new CustomEvent('popover-open', { detail: instanceId.current }));
		}
	};

	useEffect(() => {
		setCourseDetails(null);
		setFeedbackRating(0);
		setShowScrollGradient(false);
	}, [value]);

	useEffect(() => {
		if (!courseDetails) {
			return;
		}
		requestAnimationFrame(checkScrollGradient);
	}, [courseDetails]);

	useEffect(() => {
		if (!showPopover || !value || courseDetails) {
			return;
		}

		const controller = new AbortController();

		const fetchCourseDetails = async () => {
			try {
				const params = new URLSearchParams({ crosslistings: value });
				const response = await fetch(`/api/hoagie/course/details/?${params}`, {
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error: ${response.status}`);
				}

				const data = (await response.json()) as CourseDetails;
				setCourseDetails(data);
			} catch (error) {
				if (controller.signal.aborted) {
					return;
				}

				console.error('Error fetching course details:', error);
				setCourseDetails({ error: 'Failed to load course details.' });
			}
		};

		void fetchCourseDetails();

		return () => {
			controller.abort();
		};
	}, [courseDetails, showPopover, value]);

	useEffect(() => {
		const onOtherPopoverOpen = (e: Event) => {
			if ((e as CustomEvent).detail !== instanceId.current) {
				setIsVisible(false);
				setTimeout(() => setShowPopover(false), 150);
			}
		};
		window.addEventListener('popover-open', onOtherPopoverOpen);
		return () => window.removeEventListener('popover-open', onOtherPopoverOpen);
	}, []);

	useEffect(() => {
		if (!showPopover) {
			return;
		}

		const onWindowChange = () => updatePopoverPosition();
		const onOutsideClick = () => {
			setIsVisible(false);
			setTimeout(() => setShowPopover(false), 150);
		};
		window.addEventListener('resize', onWindowChange);
		window.addEventListener('scroll', onWindowChange, true);
		window.addEventListener('click', onOutsideClick);

		return () => {
			window.removeEventListener('resize', onWindowChange);
			window.removeEventListener('scroll', onWindowChange, true);
			window.removeEventListener('click', onOutsideClick);
		};
	}, [showPopover]);

	const popoverContent = showPopover ? (
		<div
			onClick={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				top: `${popoverPosition.top}px`,
				left: `${popoverPosition.left}px`,
				zIndex: 60,
				width: `min(${PANEL_WIDTH}px, calc(100vw - 24px))`,
				maxHeight: `min(calc(100vh - ${popoverPosition.top}px - 20px), 70vh)`,
				overflow: 'hidden',
				backgroundColor: '#fff',
				borderRadius: '8px',
				boxShadow: '10px 10px 20px rgba(0, 0, 0, 0.4)',
				opacity: isVisible ? 1 : 0,
				transform: isVisible ? 'scale(1)' : 'scale(0.96)',
				transformOrigin: 'left center',
				transition: 'opacity 0.15s ease, transform 0.15s ease',
			}}
		>
			<div
				ref={popoverScrollRef}
				onScroll={checkScrollGradient}
				style={{
					display: 'flex',
					flexDirection: 'column',
					overflowY: 'auto',
					maxHeight: `min(calc(100vh - ${popoverPosition.top}px - 20px), 70vh)`,
					minHeight: courseDetails ? 0 : `min(calc(100vh - ${popoverPosition.top}px - 20px), 70vh)`,
					padding: '22px',
					transition: 'min-height 0.3s ease',
				}}
			>
				{courseDetails ? (
					<div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
						{/* Header */}
						<div
							style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
						>
							{/* Left: chip, then tags, then title */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
								<div
									style={{
										backgroundImage: getDepartmentGradient(dept, 180),
										color: 'white',
										padding: '6px 16px',
										borderRadius: '6px',
										fontWeight: 600,
										fontSize: '1.1rem',
										width: 'fit-content',
										boxShadow: '0 0 0 1px rgba(63,63,68,0.05), 0 1px 3px 0 rgba(34,33,81,0.15)',
									}}
								>
									{value}
								</div>
								<div style={{ display: 'flex', gap: '6px' }}>
									{distShort && (
										<Tooltip title={distTitle} variant='soft'>
											<div
												style={{
													backgroundColor: distColor,
													color: 'white',
													padding: '2px 10px',
													borderRadius: '8px',
													fontWeight: '600',
													fontSize: '0.8rem',
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
													padding: '2px 10px',
													borderRadius: '8px',
													fontWeight: '600',
													fontSize: '0.8rem',
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
													padding: '2px 10px',
													borderRadius: '8px',
													fontWeight: '600',
													fontSize: '0.8rem',
													display: 'flex',
													alignItems: 'center',
												}}
											>
												{auditTag}
											</div>
										</Tooltip>
									)}
								</div>
								{courseDetails['Title'] && (
									<h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 600 }}>
										{String(courseDetails['Title'])}
									</h3>
								)}
							</div>
							{/* Right: external links */}
							<div style={{ display: 'flex', alignItems: 'stretch', gap: '8px', flexShrink: 0 }}>
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

						{/* Instructors + Course Setup side by side */}
						<div style={{ display: 'flex', gap: '16px' }}>
							<div style={{ flex: 1 }}>
								<SectionTitle label='Instructors' iconSrc='/icons/instructors.svg' />
								<CourseDetailSection>
									<div
										style={{
											fontSize: '0.85rem',
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

						{/* Description */}
						<div>
							<SectionTitle label='Description' iconSrc='/icons/description.svg' />
							<CourseDetailSection>
								<div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
									{String(courseDetails['Description'] ?? '')}
								</div>
							</CourseDetailSection>
						</div>

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
										)
											.slice()
											.sort((a, b) => b.percent - a.percent)
											.map(({ label, percent }, index, arr) => (
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

						{/* Student Feedback */}
						<div>
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
									backgroundColor: '#F5F5F5',
									borderRadius: '6px',
									border: '1px solid rgba(205, 215, 225, 1)',
									padding: '12px',
								}}
							>
								<ReviewMenu dept={dept} coursenum={coursenum} onRatingLoaded={setFeedbackRating} />
							</div>
						</div>
					</div>
				) : (
					<div
						style={{
							flex: 1,
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<CircularProgress size={30} sx={{ color: '#9e9e9e' }} />
					</div>
				)}
			</div>
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: '40px',
					background: 'linear-gradient(to bottom, transparent, rgba(200, 200, 200, 0.6))',
					pointerEvents: 'none',
					borderRadius: '0 0 8px 8px',
					opacity: showScrollGradient ? 1 : 0,
					transition: 'opacity 0.2s ease',
				}}
			/>
		</div>
	) : null;

	return (
		<>
			<div ref={triggerRef} onClick={togglePopover}>
				{children}
			</div>
			{popoverContent && createPortal(popoverContent, document.body)}
		</>
	);
};
