import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
	closestCenter,
	pointerWithin,
	rectIntersection,
	DndContext,
	DragOverlay,
	getFirstCollision,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensors,
	useSensor,
	MeasuringStrategy,
	defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CloudArrowUpIcon } from '@heroicons/react/20/solid';
import { Pane } from 'evergreen-ui';
import { createPortal } from 'react-dom';

import { Container, type ContainerProps } from '@/components/Container';
import containerStyles from '@/components/Container/Container.module.css';
import dashboardItemStyles from '@/components/DashboardSearchItem/DashboardSearchItem.module.css';
import { Item } from '@/components/Item';
import { Search } from '@/components/Search';
import { TabbedMenu } from '@/components/TabbedMenu/TabbedMenu';
import { useUploadModal } from '@/components/UploadModal/Upload';
import { ButtonWidget } from '@/components/Widgets/Widget';
import useSearchStore from '@/store/searchSlice';
import useUserSlice from '@/store/userSlice';
import type { Course, Profile } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';
import { getDepartmentGradient } from '@/utils/departmentColors';

import { coordinateGetter as multipleContainersCoordinateGetter } from './multipleContainersKeyboardCoordinates';

import type {
	CollisionDetection,
	DropAnimation,
	Modifiers,
	UniqueIdentifier,
	KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';

// Heights are relative to viewport height
const containerGridHeight = '87vh';
const searchGridHeight = '85vh';

// Widths are relative to viewport width.
// Search container width is 24vw, inherited from Container.module.css
const semesterWidth = '22.5vw';
const requirementsWidth = '26vw';
const courseWidth = '10.5vw';
const extendedCourseWidth = '22.0vw';

const staticRectSortingStrategy = () => {
	return {
		x: 0,
		y: 0,
		scaleX: 1,
		scaleY: 1,
	};
};

const transitionAnimation = 'width 0.2s ease-in-out, left 0.2s ease-in-out';

let csrfToken: string;

if (typeof window === 'undefined') {
	// Server-side or during pre-rendering/build time
	csrfToken = '';
} else {
	// Client-side
	void (async () => {
		csrfToken = await fetchCsrfToken();
	})();
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
	defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function DroppableContainer({
	children,
	columns = 1,
	disabled,
	id,
	items,
	style,
	...props
}: ContainerProps & {
	disabled?: boolean;
	id: UniqueIdentifier;
	items: UniqueIdentifier[];
	style?: CSSProperties;
}) {
	const { active, isDragging, over, setNodeRef, transition, transform } = useSortable({
		id,
		data: {
			type: 'container',
			children: items,
		},
		animateLayoutChanges,
	});
	const isOverContainer = over
		? (id === over.id && active.data.current.type !== 'container') || items.includes(over.id)
		: false;

	return (
		<Container
			ref={disabled ? undefined : setNodeRef}
			style={{
				...style,
				transition,
				transform: CSS.Translate.toString(transform),
				opacity: isDragging ? 0.5 : undefined,
			}}
			hover={isOverContainer}
			columns={columns}
			{...props}
		>
			{children}
		</Container>
	);
}

const dropAnimation: DropAnimation = {
	duration: 200,
	sideEffects: defaultDropAnimationSideEffects({
		styles: {
			active: {
				opacity: '0.5',
			},
		},
	}),
};

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

type Props = {
	profile: Profile;
	adjustScale?: boolean;
	columns?: number;

	// TODO: Consider removing since we populate semester bins based on classyear
	initialItems?: Items;
	containerStyle?: CSSProperties;

	coordinateGetter?: KeyboardCoordinateGetter;

	getItemStyles?(args: {
		value: UniqueIdentifier;
		index: number;
		overIndex: number;
		isDragging: boolean;
		containerId: UniqueIdentifier;
		isSorting: boolean;
		isDragOverlay: boolean;
	}): CSSProperties;

	itemCount?: number;
	items?: Items;
	handle?: boolean;
	onRemove?(courseId: string): void;

	modifiers?: Modifiers;
	minimal?: boolean;
	scrollable?: boolean;
	vertical?: boolean;
};

export const PLACEHOLDER_ID = 'placeholder';
export const SEARCH_RESULTS_ID = 'Search Results';
const defaultClassYear = new Date().getFullYear() + 1;

export function Canvas({
	profile,
	adjustScale = false,
	columns = 2,
	handle = true,
	containerStyle,
	coordinateGetter = multipleContainersCoordinateGetter,
	getItemStyles = () => ({}),
	minimal = false,
	scrollable,
}: Props) {
	// Subscribe to user slice to let Canvas and Nav/UserSettings sync academicPlan states
	// This allows us to re-render TabbedMenu when academicPlan changes without reloading the entire page
	const { updateRequirements } = useUserSlice((state) => ({
		updateRequirements: state.updateRequirements,
	}));

	const refreshData = async () => {
		try {
			// Fetch new course data
			const fetchedData = await fetchCourses();
			if (fetchedData) {
				setItems((prevItems) => ({
					...updateSemesters(prevItems, classYear, fetchedData),
				}));
			}
			// Update requirements
			await updateRequirements();
		} catch (err) {
			console.error('Error refreshing data:', err);
		}
	};

	const { openUploadModal, uploadModal, notification } = useUploadModal(profile, refreshData);

	// This limits the width of the course cards
	const wrapperStyle = () => ({
		width: courseWidth,
	});
	const searchWrapperStyle = () => ({
		width: '100%',
		overflow: 'hidden', // Ensure overflow is hidden
		whiteSpace: 'nowrap', // Keep the text on a single line
		textOverflow: 'ellipsis', // Add ellipsis to text overflow
	});

	// The width of the semester bins
	const semesterStyle = {
		...containerStyle,
		width: semesterWidth,
	};

	const classYear = profile.classYear ?? defaultClassYear;

	const generateSemesters = (classYear: number): Items => {
		const semesters: Items = {};
		const startYear = classYear - 4;

		for (let year = startYear; year < classYear; ++year) {
			semesters[`Fall ${year}`] = [];
			semesters[`Spring ${year + 1}`] = [];
		}
		return semesters;
	};

	const updateSemesters = (
		prevItems: Items,
		classYear: number,
		userCourses: { [key: number]: Course[] }
	): Items => {
		const startYear = classYear - 4;
		let semester = 1;
		for (let year = startYear; year < classYear; ++year) {
			// Use Set to ensure unique course IDs
			const fallCourses = [
				...new Set(
					userCourses[semester].map((course) => `${course.course_id}|${course.crosslistings}`)
				),
			];
			prevItems[`Fall ${year}`] = fallCourses;
			semester += 1;

			const springCourses = [
				...new Set(
					userCourses[semester].map((course) => `${course.course_id}|${course.crosslistings}`)
				),
			];
			prevItems[`Spring ${year + 1}`] = springCourses;
			semester += 1;
		}
		return prevItems;
	};

	const semesters = generateSemesters(classYear);
	const [items, setItems] = useState<Items>(() => ({
		[SEARCH_RESULTS_ID]: [], // Initialize search container with no courses
		...semesters,
	}));

	type Dictionary = {
		[key: string]: any; // TODO: Aim to replace 'any' with more specific types.
	};

	// Initialize a more structured dictionary if possible
	const initialRequirements: Dictionary = {};

	// State for academic requirements
	const [academicPlan] = useState<Dictionary>(initialRequirements);

	// TODO: Make this dynamic later
	const userMajorCode = 'COS-BSE';
	const userMinors = [];
	const userCertificates = [];

	// Structure to hold degree requirements
	const degreeRequirements: Dictionary = { General: '' };

	// Add major to degree requirements if it's a string
	if (userMajorCode && typeof userMajorCode === 'string') {
		degreeRequirements[userMajorCode] = academicPlan[userMajorCode] ?? {};
	}

	// Iterate over minors and add them to degree requirements if their code is a string
	userMinors.forEach((minor) => {
		const minorCode = minor.code;
		if (minorCode && typeof minorCode === 'string') {
			degreeRequirements[minorCode] = academicPlan[minorCode] ?? {};
		}
	});

	// Iterate over certificates and add them to degree requirements if their code is a string
	userCertificates.forEach((certificate) => {
		const certificateCode = certificate.code;
		if (certificateCode && typeof certificateCode === 'string') {
			degreeRequirements[certificateCode] = academicPlan[certificateCode] ?? {};
		}
	});

	const fetchCourses = useCallback(async () => {
		try {
			const response = await fetch(`${process.env.BACKEND}/fetch_courses/`, {
				method: 'GET',
				credentials: 'include',
				headers: {
					'X-NetId': profile.netId,
				},
			});
			const data = await response.json();
			return data;
		} catch {
			return null; // TODO: Handle error appropriately
		}
	}, [profile.netId]);

	// Fetch user courses and check requirements on initial render
	useEffect(() => {
		const fetchAndUpdateData = async () => {
			try {
				const fetchedData = await fetchCourses();
				if (fetchedData) {
					setItems((prevItems) => ({
						...updateSemesters(prevItems, classYear, fetchedData),
					}));
				}
				await updateRequirements();
			} catch (err) {
				console.error('Error fetching courses:', err);
			}
		};

		void fetchAndUpdateData();
	}, [classYear, fetchCourses, updateRequirements]);

	const staticSearchResults = useSearchStore((state) => state.searchResults);
	const [searchResults, setSearchResults] = useState(staticSearchResults);

	useEffect(() => {
		setSearchResults(staticSearchResults);
	}, [staticSearchResults]);

	useEffect(() => {
		setItems((prevItems) => {
			const userCurrentCourses: Set<string> = new Set<string>();
			Object.keys(prevItems).forEach((key) => {
				if (key !== SEARCH_RESULTS_ID) {
					const courses = prevItems[key];
					courses.forEach((course) => {
						userCurrentCourses.add(course.toString());
					});
				}
			});

			return {
				...prevItems,
				[SEARCH_RESULTS_ID]: searchResults
					.filter(
						(course) => !userCurrentCourses.has(`${course.course_id}|${course.crosslistings}`)
					)
					.map((course) => `${course.course_id}|${course.crosslistings}`),
			};
		});
	}, [searchResults]);

	const initialContainers = [SEARCH_RESULTS_ID, ...Object.keys(semesters)];
	const containers = initialContainers;
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
	const [activeContainerId, setActiveContainerId] = useState<UniqueIdentifier | null>(null);
	const lastOverId = useRef<UniqueIdentifier | null>(null);
	const recentlyMovedToNewContainer = useRef(false);
	// isSortingContainer is legacy code, since we are not using sortable containers
	const isSortingContainer = false;
	const [overContainerId, setOverContainerId] = useState<UniqueIdentifier | null>(null);

	/**
	 * Custom collision detection strategy optimized for multiple containers
	 *
	 * - First, find any droppable containers intersecting with the pointer.
	 * - If there are none, find intersecting containers with the active draggable.
	 * - If there are no intersecting containers, return the last matched intersection
	 *
	 */
	const collisionDetectionStrategy: CollisionDetection = useCallback(
		(args) => {
			// Start by finding any intersecting droppable
			const pointerIntersections = pointerWithin(args);
			const intersections =
				pointerIntersections.length > 0
					? // If there are droppables intersecting with the pointer, return those
						pointerIntersections
					: rectIntersection(args);
			let overId = getFirstCollision(intersections, 'id');

			if (overId !== null) {
				if (overId in items) {
					const containerItems = items[overId];

					// If a container is matched and it contains items (columns 'A', 'B', 'C')
					if (containerItems.length > 0) {
						// Return the closest droppable within that container
						overId = closestCenter({
							...args,
							droppableContainers: args.droppableContainers.filter(
								(container) => container.id !== overId && containerItems.includes(container.id)
							),
						})[0]?.id;
					}
				}

				lastOverId.current = overId;

				return [{ id: overId }];
			}
			// When a draggable item moves to a new container, the layout may shift
			// and the `overId` may become `null`. We manually set the cached `lastOverId`
			// to the id of the draggable item that was moved to the new container, otherwise
			// the previous `overId` will be returned which can cause items to incorrectly shift positions
			if (recentlyMovedToNewContainer.current) {
				lastOverId.current = activeId;
			}

			// If no droppable is matched, return the last match
			return lastOverId.current ? [{ id: lastOverId.current }] : [];
		},
		[activeId, items]
	);
	const [clonedItems, setClonedItems] = useState<Items | null>(null);
	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter,
		})
	);
	const findContainer = (id?: UniqueIdentifier) => {
		if (id === null || id === undefined) {
			return;
		}
		if (id in items) {
			return id;
		}
		return Object.keys(items).find((key) => items[key].includes(id));
	};

	const getIndex = (id: UniqueIdentifier) => {
		const container = findContainer(id);

		if (!container) {
			return -1;
		}

		const index = items[container].indexOf(id);

		return index;
	};

	const onDragCancel = () => {
		if (clonedItems) {
			// Reset items to their original state in case items have been
			// Dragged across containers
			setItems(clonedItems);
		}

		setActiveId(null);
		setActiveContainerId(null);
		setOverContainerId(null);
		setClonedItems(null);
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				placeItems: 'center',
			}}
		>
			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetectionStrategy}
				measuring={{
					droppable: {
						strategy: MeasuringStrategy.Always,
					},
				}}
				onDragStart={({ active }) => {
					const activeContainer = findContainer(active.id);

					setActiveId(active.id);
					setActiveContainerId(activeContainer ?? null);
					setOverContainerId(activeContainer ?? null);
					setClonedItems(items);
				}}
				onDragOver={({ active, over }) => {
					const overId = over?.id;
					if (overId === null || overId === undefined || active.id in items) {
						return;
					}

					const overContainer = findContainer(overId);
					const activeContainer = findContainer(active.id);
					setOverContainerId(overContainer ?? null);

					if (!overContainer || !activeContainer) {
						return;
					}

					if (activeContainer !== overContainer) {
						setItems((items) => {
							const activeItems = items[activeContainer];
							const activeIndex = activeItems.indexOf(active.id);
							recentlyMovedToNewContainer.current = true;

							return {
								...items,
								[activeContainer]: items[activeContainer].filter((item) => item !== active.id),
								[overContainer]: [...items[overContainer], items[activeContainer][activeIndex]],
							};
						});
					}
				}}
				onDragEnd={async ({ active, over }) => {
					// Active and over are course draggables.
					if (!activeContainerId) {
						setActiveId(null);
						return;
					}

					const overId = over?.id;

					if (overId === null || overId === undefined) {
						setActiveId(null);
						setActiveContainerId(null);
						return;
					}

					const overContainerId = findContainer(overId);

					if (overContainerId) {
						if (activeContainerId !== overContainerId) {
							csrfToken = await fetchCsrfToken();
							void fetch(`${process.env.BACKEND}/update_courses/`, {
								method: 'POST',
								credentials: 'include',
								headers: {
									'Content-Type': 'application/json',
									'X-NetId': profile.netId,
									'X-CSRFToken': csrfToken,
								},
								body: JSON.stringify({
									crosslistings: active.id.toString().split('|')[1],
									semesterId: overContainerId,
								}),
							}).then((response) => {
								void response.json();
								void updateRequirements();
							});
						}
					}

					setActiveId(null);
					setActiveContainerId(null);
					setOverContainerId(null);
				}}
				cancelDrop={() => overContainerId === SEARCH_RESULTS_ID}
				onDragCancel={onDragCancel}
			>
				<SortableContext items={[...containers, PLACEHOLDER_ID]}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
						}}
					>
						{/* Left Section for Search Results */}
						{containers.includes(SEARCH_RESULTS_ID) && (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									height: containerGridHeight,
								}}
							>
								{/* issue here with resizing + with requirements dropdowns*/}
								{/* Try to get this to fixed height*/}
								<div className='mt-2.1 mx-[0.5vw] my-[1vh] -mb-0.5'>
									<Pane
										display='flex'
										alignItems='center'
										justifyContent='center'
										cursor='pointer'
										onClick={openUploadModal}
									>
										<ButtonWidget
											text='Import Courses From Transcript'
											icon={<CloudArrowUpIcon className='h-5 w-5' />}
											onClick={() => openUploadModal()}
										/>
									</Pane>
									{uploadModal}
									{notification}
								</div>
								<DroppableContainer
									key={SEARCH_RESULTS_ID}
									id={SEARCH_RESULTS_ID}
									label={<Search />}
									columns={1}
									items={items[SEARCH_RESULTS_ID]}
									scrollable={scrollable}
									style={containerStyle}
									height={searchGridHeight}
								>
									<SortableContext
										items={items[SEARCH_RESULTS_ID]}
										strategy={staticRectSortingStrategy}
									>
										{staticSearchResults.map((course, index) => {
											const courseId = `${course.course_id}|${course.crosslistings}`;
											return (
												<div className={dashboardItemStyles.card} key={index}>
													<div className={dashboardItemStyles.content}>
														<div className={dashboardItemStyles.title}>{course.title}</div>
														{items[SEARCH_RESULTS_ID].includes(courseId) ? (
															<SortableItem
																disabled={isSortingContainer}
																key={index}
																id={courseId}
																index={index}
																handle={handle}
																style={getItemStyles}
																wrapperStyle={searchWrapperStyle}
																containerId={SEARCH_RESULTS_ID}
																getIndex={getIndex}
															/>
														) : (
															<SortableItem
																disabled={true}
																key={index}
																id={courseId + '|disabled'}
																index={index}
																handle={handle}
																style={getItemStyles}
																wrapperStyle={searchWrapperStyle}
																containerId={SEARCH_RESULTS_ID}
																getIndex={getIndex}
															/>
														)}
													</div>
												</div>
											);
										})}
									</SortableContext>
								</DroppableContainer>
							</div>
						)}

						{/* Center Section for other containers in a 2x4 grid */}
						<div className={containerStyles.gridContainer}>
							{containers
								.filter((id) => id !== 'Search Results')
								.map((containerId) => (
									<div
										key={containerId}
										style={{
											display: 'flex',
											flexDirection: 'column',
											height: `calc(${containerGridHeight} / 4)`,
										}}
									>
										<DroppableContainer
											key={containerId}
											id={containerId}
											label={minimal ? undefined : `${containerId}`}
											columns={columns}
											items={items[containerId] || []}
											scrollable={scrollable}
											style={semesterStyle}
											unstyled={minimal}
											height={`calc(${containerGridHeight} / 4)`}
										>
											<SortableContext
												items={items[containerId] || []}
												strategy={staticRectSortingStrategy}
											>
												{items[containerId] &&
													items[containerId].map((course, index) => (
														<SortableItem
															disabled={isSortingContainer}
															key={index}
															id={course}
															index={index}
															handle={handle}
															style={getItemStyles}
															wrapperStyle={wrapperStyle}
															onRemove={() => handleRemove(course, containerId)}
															containerId={containerId}
															getIndex={getIndex}
														/>
													))}
											</SortableContext>
										</DroppableContainer>
									</div>
								))}
						</div>

						{/* Right section for requirements */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								height: containerGridHeight,
								width: requirementsWidth,
							}}
						>
							<TabbedMenu profile={profile} csrfToken={csrfToken} />
						</div>
					</div>
				</SortableContext>

				{createPortal(
					<DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
						{activeId ? renderSortableItemDragOverlay(activeId) : null}
					</DragOverlay>,
					document.body
				)}
			</DndContext>
		</div>
	);

	function renderSortableItemDragOverlay(id: UniqueIdentifier) {
		// Determine the current overlay width based on overContainerId
		const currentOverlayWidth =
			activeContainerId === SEARCH_RESULTS_ID && overContainerId === SEARCH_RESULTS_ID
				? extendedCourseWidth
				: courseWidth;
		const currentOverlayLeft =
			activeContainerId === SEARCH_RESULTS_ID && overContainerId !== SEARCH_RESULTS_ID
				? `calc(${extendedCourseWidth} - ${courseWidth})`
				: '0vw';

		// Modify the wrapperStyle function or directly adjust the style here to use the determined width
		const dynamicWrapperStyle = {
			...wrapperStyle(), // Spread the original styles
			width: currentOverlayWidth, // Override the width with the current overlay width
			left: currentOverlayLeft,
			transition: transitionAnimation, // Ensure smooth transition
		};

		return (
			<Item
				value={id}
				handle={handle}
				style={getItemStyles({
					containerId: findContainer(id) as UniqueIdentifier,
					overIndex: -1,
					index: getIndex(id),
					value: id,
					isSorting: true,
					isDragging: true,
					isDragOverlay: true,
				})}
				color_primary={getPrimaryColor(id)}
				color_secondary={getSecondaryColor(id)}
				wrapperStyle={dynamicWrapperStyle}
				dragOverlay
			/>
		);
	}

	function handleRemove(value: UniqueIdentifier, containerId: UniqueIdentifier) {
		setItems((items) => {
			const userCurrentCourses: Set<string> = new Set<string>();
			Object.keys(items).forEach((key) => {
				if (key !== SEARCH_RESULTS_ID) {
					const courses = items[key];
					courses.forEach((course) => {
						if (course.toString() !== value.toString()) {
							userCurrentCourses.add(course.toString());
						}
					});
				}
			});
			const updatedCourses = {
				...items,
				[SEARCH_RESULTS_ID]: searchResults
					.filter(
						(course) => !userCurrentCourses.has(`${course.course_id}|${course.crosslistings}`)
					)
					.map((course) => `${course.course_id}|${course.crosslistings}`),
				[containerId]: items[containerId].filter((course) => course !== value.toString()),
			};
			return updatedCourses;
		});

		void fetch(`${process.env.BACKEND}/update_courses/`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrfToken,
				'X-NetId': profile.netId,
			},
			body: JSON.stringify({
				crosslistings: value.toString().split('|')[1],
				semesterId: 'Search Results',
			}),
		}).then((response) => {
			void response.json();
			void updateRequirements();
		});
	}
}

function getPrimaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the first color
	const colors = gradient.split(',');
	const firstColor = colors[1]?.trim();

	return firstColor;
}

function getSecondaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the second color
	const colors = gradient.split(',');
	const secondColor = colors[2]?.trim().split(')')[0];

	return secondColor;
}

type SortableItemProps = {
	containerId: UniqueIdentifier;
	id: UniqueIdentifier;
	index: number;
	handle: boolean;
	disabled?: boolean;

	style(args: {
		value: UniqueIdentifier;
		index: number;
		overIndex: number;
		isDragging: boolean;
		containerId: UniqueIdentifier;
		isSorting: boolean;
		isDragOverlay?: boolean;
	}): CSSProperties;

	getIndex(id: UniqueIdentifier): number;

	onRemove?(): void;

	wrapperStyle({ index }: { index: number }): CSSProperties;
};

function SortableItem({
	disabled,
	id,
	index,
	handle,
	onRemove,
	style,
	containerId,
	getIndex,
	wrapperStyle,
}: SortableItemProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		listeners,
		isDragging,
		isSorting,
		over,
		overIndex,
		transform,
		transition,
	} = useSortable({
		id,
	});
	const mounted = useMountStatus();
	const mountedWhileDragging = isDragging && !mounted;

	return (
		<Item
			disabled={disabled}
			ref={disabled ? undefined : setNodeRef}
			value={id}
			dragging={isDragging}
			sorting={isSorting}
			handle={handle}
			handleProps={handle ? setActivatorNodeRef : undefined}
			index={index}
			wrapperStyle={wrapperStyle({ index })}
			style={style({
				index,
				value: id,
				isDragging,
				isSorting,
				overIndex: over ? getIndex(over.id) : overIndex,
				containerId,
			})}
			color_primary={getPrimaryColor(id)}
			color_secondary={getSecondaryColor(id)}
			transition={transition}
			transform={transform}
			fadeIn={mountedWhileDragging}
			listeners={listeners}
			onRemove={onRemove}
		/>
	);
}

function useMountStatus() {
	const [isMounted, setIsMounted] = useState<boolean>(false);

	useEffect(() => {
		const timeout = setTimeout(() => setIsMounted(true), 500);

		return () => clearTimeout(timeout);
	}, []);

	return isMounted;
}
