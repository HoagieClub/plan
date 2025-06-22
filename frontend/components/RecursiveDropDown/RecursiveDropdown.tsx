import { type FC } from 'react';
import { useEffect, useState, useCallback } from 'react';

import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Button as JoyButton } from '@mui/joy';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import styles from '@/components/InfoComponent/InfoComponent.module.css';
import { LoadingComponent } from '@/components/LoadingComponent';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import useSearchStore from '@/store/searchSlice';
import useUserSlice from '@/store/userSlice';
import type { Profile } from '@/types';

interface Dictionary {
	// TODO: Address this typing eventually.

	[key: string]: any;
}

interface DropdownProps {
	academicPlan: Dictionary;
	profile: Profile;
	csrfToken: string;
}

interface SatisfactionStatusProps {
	satisfied: string;
	manuallySatisfied: string;
	count: number;
	minNeeded: number;
	maxCounted: number;
	isRestrictions: boolean;
}

const semesterMap = {
	1: 'Freshman fall',
	2: 'Freshman spring',
	3: 'Sophomore fall',
	4: 'Sophomore spring',
	5: 'Junior fall',
	6: 'Junior spring',
	7: 'Senior fall',
	8: 'Senior spring',
};

// Satisfaction status icon with styling
const SatisfactionStatus: FC<SatisfactionStatusProps> = ({
	satisfied,
	manuallySatisfied,
	count,
	minNeeded,
	maxCounted,
	isRestrictions,
}) => {
	if (manuallySatisfied) {
		return (
			<CheckCircleOutlineIcon
				style={{ color: '#9ca3af', marginLeft: '0.2em', marginTop: '0.1em', fontSize: '1.3em' }}
			/>
		);
	}
	if (isRestrictions) {
		return <InfoOutlinedIcon style={{ color: 'blue', marginLeft: '0.2em', fontSize: '1.3em' }} />;
	}
	if (maxCounted > 1) {
		return (
			<>
				{satisfied === 'True' ? (
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<span style={{ fontWeight: 450, color: 'green' }}>{Math.floor(count / minNeeded)}</span>
						<AddCircleOutlineOutlinedIcon
							style={{ color: 'green', marginLeft: '0.2em', fontSize: '1.3em' }}
						/>
					</div>
				) : (
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<span style={{ fontWeight: 450, color: 'red', marginLeft: '0.2em' }}>
							{count}/{minNeeded}
						</span>
						<HighlightOffIcon style={{ color: 'red', marginLeft: '0.2em', fontSize: '1.3em' }} />
					</div>
				)}
			</>
		);
	}
	return (
		<>
			{satisfied === 'True' ? (
				<CheckCircleOutlineIcon
					style={{ color: 'green', marginLeft: '0.2em', marginTop: '0.1em', fontSize: '1.3em' }}
				/>
			) : (
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<span style={{ fontWeight: 450, color: 'red', marginLeft: '0.2em' }}>
						{count}/{minNeeded}
					</span>
					<HighlightOffIcon style={{ color: 'red', marginLeft: '0.2em', fontSize: '1.3em' }} />
				</div>
			)}
		</>
	);
};

// Dropdown component with refined styling
const Dropdown: FC<DropdownProps> = ({ academicPlan, profile, csrfToken }) => {
	// Subscribe to user slice to access the same updateRequirements hook everywhere
	// This allows us to re-render TabbedMenu without reloading the entire page
	const { updateRequirements } = useUserSlice((state) => ({
		updateRequirements: state.updateRequirements,
	}));

	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [markedSatisfied, setMarkedSatisfied] = useState<boolean>(false);

	// TODO: Address this typing eventually.

	const [explanation, setExplanation] = useState<{ [key: number]: any } | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [expanded, setExpanded] = useState(new Set());

	const handleChange = (event, key) => {
		if (event.type === 'keydown' && (event.key === 'Enter' || event.keyCode === 13)) {
			event.preventDefault(); // Prevent the default action
			return; // Exit without toggling the state
		}

		setExpanded((prev) => {
			const newExpanded = new Set(prev);
			if (newExpanded.has(key)) {
				newExpanded.delete(key);
			} else {
				newExpanded.add(key);
			}
			return newExpanded;
		});
	};

	const handleExplanationClick = (event, reqId) => {
		setIsLoading(true);
		const url = new URL(`${process.env.BACKEND}/requirement_info/`);
		url.searchParams.append('reqId', reqId);

		fetch(url.toString(), {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'X-NetId': profile.netId,
			},
		})
			.then((response) => response.json())
			.then((academicPlan) => {
				setExplanation(academicPlan);
				if (academicPlan) {
					setMarkedSatisfied(academicPlan[7]);
				}
			})
			.finally(() => setIsLoading(false))
			.catch((error) => {
				console.error(error);
			});
		event.stopPropagation();
		setShowPopup(true);
	};

	const handleCancel = useCallback(() => {
		setExplanation('');
		setMarkedSatisfied(false);
		setShowPopup(false);
	}, [setExplanation, setShowPopup]); // Dependencies

	const handleSearch = useCallback(() => {
		let searchResults = [];

		if (explanation && explanation[5]) {
			searchResults = [...searchResults, ...explanation[5]];
		}
		if (explanation && explanation[6]) {
			searchResults = [...searchResults, ...explanation[6]];
		}

		searchResults.sort((course1, course2) => {
			if (course1.crosslistings < course2.crosslistings) {
				return -1;
			}
			if (course1.crosslistings > course2.crosslistings) {
				return 1;
			}
			return 0;
		});

		useSearchStore.getState().setSearchResults(searchResults);
		handleCancel();
	}, [explanation, handleCancel]);

	const handleMarkSatisfied = () => {
		if (explanation === null) {
			return;
		}
		fetch(`${process.env.BACKEND}/mark_satisfied/`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'X-NetId': profile.netId,
				'X-CSRFToken': csrfToken,
			},
			body: JSON.stringify({
				reqId: explanation ? explanation[0] : null,
				markedSatisfied: 'true',
			}),
		})
			.then((response) => response.json())
			.then(() => {
				setMarkedSatisfied(true);
				void updateRequirements();
			})
			.catch((error) => {
				console.error(error);
			});
	};

	const handleUnmarkSatisfied = () => {
		if (explanation === null) {
			return;
		}
		fetch(`${process.env.BACKEND}/mark_satisfied/`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'X-NetId': profile.netId,
				'X-CSRFToken': csrfToken,
			},
			body: JSON.stringify({
				reqId: explanation ? explanation[0] : null,
				markedSatisfied: 'false',
			}),
		})
			.then((response) => response.json())
			.then(() => {
				setMarkedSatisfied(true);
				void updateRequirements();
			})
			.catch((error) => {
				console.error(error);
			});
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				handleSearch();
			} else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				handleCancel();
			}
		};

		if (showPopup) {
			document.addEventListener('keydown', handleKeyDown);
		}

		// Remove event listener if showPopup is false, or on unmount.
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showPopup, handleCancel, handleSearch]);

	const modalContent = showPopup ? (
		<Modal>
			<div
				style={{
					overflowWrap: 'break-word',
					flexWrap: 'wrap',
					overflowY: 'auto',
					maxHeight: '75vh',
				}}
			>
				<div className={styles.detailRow}>
					{explanation ? (
						Object.entries(explanation).map(([index, value]) => {
							if (index === '1') {
								if (value) {
									return (
										<div key={index} className={styles.section}>
											<strong className={styles.strong}>Explanation: </strong>
											<span dangerouslySetInnerHTML={{ __html: value }} />
										</div>
									);
								} else {
									return (
										<div key={index} className={styles.section}>
											<strong className={styles.strong}>Explanation: </strong>
											No explanation available
										</div>
									);
								}
							}
							if (index === '2' && value !== 8) {
								return (
									<div key={index} className={styles.section}>
										<strong className={styles.strong}>Complete by: </strong>
										{semesterMap[value]}
									</div>
								);
							}
							if (index === '3' && value[0]) {
								return (
									<div key={index} className={styles.section}>
										<strong className={styles.strong}>
											{value.length > 1 ? 'Distribution areas' : 'Distribution area'}:{' '}
										</strong>
										{value
											.map((area) => {
												return `${area}, `;
											})
											.join('')
											.slice(0, -2)}
									</div>
								);
							}
							if (index === '5' && !explanation[3][0]) {
								return value[0] || explanation[4][0] ? (
									<div key={index} className={styles.section}>
										<strong className={styles.strong}>Course list: </strong>
										{explanation[4][0]
											? explanation[4]
													.map((department) => {
														return `${department} (any), `;
													})
													.join('')
													.slice(0, -2)
											: null}
										{explanation[4][0] && value[0] ? ', ' : null}
										{value[0]
											? value
													.slice(0, 20)
													.map((course, index) => {
														const separator = index === 19 && value.length > 20 ? '...' : ', ';
														return `${course.crosslistings}${separator}`;
													})
													.join('')
													.slice(0, value.length > 20 ? undefined : -2)
											: null}
									</div>
								) : null;
							}
						})
					) : (
						<LoadingComponent />
					)}
				</div>
			</div>
			<footer className='mt-auto text-right'>
				{explanation &&
					((explanation[5] && explanation[5].length > 0) ||
						(explanation[6] && explanation[6].length > 0)) && (
						<JoyButton variant='soft' color='primary' onClick={handleSearch} size='md'>
							Search Courses
						</JoyButton>
					)}
				{!isLoading &&
					(markedSatisfied ? (
						<JoyButton
							variant='soft'
							color='warning'
							onClick={handleUnmarkSatisfied}
							sx={{ ml: 2 }}
							size='md'
						>
							Unmark Satisfied
						</JoyButton>
					) : (
						<JoyButton
							variant='soft'
							color='success'
							onClick={handleMarkSatisfied}
							sx={{ ml: 2 }}
							size='md'
						>
							Mark Satisfied
						</JoyButton>
					))}
				<JoyButton variant='soft' color='neutral' onClick={handleCancel} sx={{ ml: 2 }} size='md'>
					Close
				</JoyButton>
			</footer>
		</Modal>
	) : null;

	const handleClick = (crosslistings, reqId) => {
		fetch(`${process.env.BACKEND}/manually_settle/`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'X-NetId': profile.netId,
				'X-CSRFToken': csrfToken,
			},
			body: JSON.stringify({ crosslistings: crosslistings, reqId: reqId }),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.json();
			})
			.then(() => {
				void updateRequirements();
			})
			.catch((error) => {
				console.error('Error during manual settling:', error);
			});
	};

	const renderContent = (academicPlan: Dictionary) => {
		if (!academicPlan || typeof academicPlan !== 'object') {
			return <LoadingComponent />;
		}

		return Object.entries(academicPlan).map(([key, value]) => {
			if (
				key === 'req_id' ||
				key === 'satisfied' ||
				key === 'manually_satisfied' ||
				key === 'count' ||
				key === 'min_needed' ||
				key === 'max_counted'
			) {
				return null;
			}
			const isArray = Array.isArray(value);
			if (isArray) {
				if (key === 'settled') {
					// Render as disabled buttons
					return value[0].map((item, index) => (
						<Button
							key={index}
							variant='contained'
							size='small'
							disabled={!item['manually_settled'].includes(value[1])}
							style={{
								color: '#ffffff',
								opacity: 0.9,
								backgroundColor: '#409853',
								margin: '5px',
							}}
							onClick={() => handleClick(item['crosslistings'], value[1])}
						>
							{item['code']}
						</Button>
					));
				} else if (key === 'unsettled') {
					// Render as warning buttons
					return value[0].map((item, index) => (
						<Button
							key={index}
							variant='contained'
							size='small'
							color='error'
							sx={{
								margin: '5px',
								color: '#ffffff',
								opacity: '0.5',
								background:
									'repeating-linear-gradient(45deg, #d32f2f, #d32f2f 10px, #bf2a2a 10px, #bf2a2a 14px)', // Striped background
							}}
							onClick={() => handleClick(item['crosslistings'], value[1])}
						>
							{item['code']}
						</Button>
					));
				}
			}
			const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
			const isRestrictions = key === 'Restrictions';
			const satisfactionElement =
				isObject && 'satisfied' in value ? (
					<SatisfactionStatus
						satisfied={value.satisfied}
						manuallySatisfied={value.manually_satisfied}
						count={value.count}
						minNeeded={value.min_needed}
						maxCounted={value.max_counted}
						isRestrictions={isRestrictions}
					/>
				) : null;

			const subItems = isObject ? { ...value, satisfied: undefined } : value;
			let settledEmpty = false;
			let unsettledEmpty = false;

			if (Object.prototype.hasOwnProperty.call(value, 'settled')) {
				if (Array.isArray(value['settled']) && value['settled'].length > 0) {
					settledEmpty = Array.isArray(value['settled'][0]) && value['settled'][0].length === 0;
				}
			}
			if (Object.prototype.hasOwnProperty.call(value, 'unsettled')) {
				if (Array.isArray(value['unsettled']) && value['unsettled'].length > 0) {
					unsettledEmpty =
						Array.isArray(value['unsettled'][0]) && value['unsettled'][0].length === 0;
				}
			}

			const hasItems = settledEmpty && unsettledEmpty;
			const hasNestedItems = isObject && Object.keys(subItems).length > 0;

			// Style adjustments for accordion components
			return (
				<Accordion
					key={key}
					style={{
						margin: 0,
						boxShadow: 'none',
						borderTop: '1px solid #e0e0e0',
					}}
					expanded={!expanded.has(key)}
					onChange={(event) => handleChange(event, key)} // TODO: disable propagation in modals
				>
					<AccordionSummary
						expandIcon={hasNestedItems && !hasItems ? <ExpandMoreIcon /> : null}
						aria-controls={`${key}-content`}
						id={`${key}-header`}
						sx={{ pt: 0, backgroundColor: '#fff' }}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								width: '100%',
							}}
						>
							<div
								className={cn(styles.Action)}
								onClick={(event) => handleExplanationClick(event, academicPlan[key]['req_id'])}
							>
								<Typography style={{ fontWeight: 500 }}>{key}</Typography>
							</div>
							{satisfactionElement}
						</div>
					</AccordionSummary>
					{!hasItems && (
						<AccordionDetails sx={{ backgroundColor: '#fff' }}>
							{hasNestedItems ? renderContent(subItems) : <Typography>{value}</Typography>}
						</AccordionDetails>
					)}
				</Accordion>
			);
		});
	};

	return (
		<>
			{renderContent(academicPlan)}
			{modalContent}
		</>
	);
};

// Recursive dropdown component
interface RecursiveDropdownProps {
	academicPlan: Dictionary;
	profile: Profile;
	csrfToken: string;
}

export const RecursiveDropdown: FC<RecursiveDropdownProps> = ({
	academicPlan,
	profile,
	csrfToken,
}) => {
	return <Dropdown academicPlan={academicPlan} profile={profile} csrfToken={csrfToken} />;
};
