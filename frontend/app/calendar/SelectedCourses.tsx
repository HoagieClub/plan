import { type FC, useMemo, useState } from 'react';

import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { Button, Snackbar } from '@mui/joy';
import Alert from '@mui/material/Alert';
import { Virtuoso } from 'react-virtuoso';

import useCalendarStore from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import { fetchCsrfToken } from '@/utils/csrf';
import { termsInverse } from '@/utils/terms';

import styles from './SelectedCourses.module.css';
import { SortableCalendarItem } from './SortableCalendarItem';

export const SelectedCourses: FC = () => {
	const { termFilter } = useFilterStore((state) => state);
	const selectedCourses = useCalendarStore((state) => state.getSelectedCourses(termFilter));
	const [openSuccessSnackBar, setOpenSuccessSnackBar] = useState(false);
	const [openErrorSnackBar, setOpenErrorSnackBar] = useState(false);

	const uniqueCourses = useMemo(() => {
		const seenGuids = new Set();

		return selectedCourses.filter((course) => {
			const isNew = !seenGuids.has(course.course.guid);

			if (isNew) {
				seenGuids.add(course.course.guid);
			}

			return isNew;
		});
	}, [selectedCourses]);

	const exportCalendar = async () => {
		if (!termFilter) {
			setOpenErrorSnackBar(true);
			return;
		}

		const hasMeetingTime = (course: (typeof selectedCourses)[number]) => {
			const meetings = course.section?.class_meetings;
			return meetings && meetings.length > 0 && meetings[0]?.days && meetings[0].days.trim() !== '';
		};

		const hasUnselectedRequired = selectedCourses.some(
			(course) =>
				course.isActive && course.needsChoice && !course.isChosen && hasMeetingTime(course)
		);

		if (hasUnselectedRequired) {
			setOpenErrorSnackBar(true);
			return;
		}

		const classSections = selectedCourses.filter(
			(course) => (course.isChosen || !course.needsChoice) && hasMeetingTime(course)
		);

		if (classSections.length === 0) {
			setOpenErrorSnackBar(true);
			return;
		}

		const seenSectionIds = new Set<number>();
		const uniqueCourseSections = classSections.filter((section) => {
			if (seenSectionIds.has(section.section.id)) {
				return false;
			}
			seenSectionIds.add(section.section.id);
			return true;
		});

		try {
			const csrfToken = await fetchCsrfToken();
			const response = await fetch(`/api/hoagie/export-calendar`, {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrfToken,
				},
				body: JSON.stringify({
					term: termFilter,
					class_sections: uniqueCourseSections,
				}),
			});

			if (!response.ok) {
				throw new Error(`Export failed: ${await response.text()}`);
			}

			const term = termsInverse[termFilter];
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${term}_schedule.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			setOpenSuccessSnackBar(true);
		} catch (error) {
			console.error('Export failed:', error);
			setOpenErrorSnackBar(true);
		}
	};

	return (
		<>
			<div className={styles.container}>
				<div className={styles.header}>
					<h3>Selected Courses</h3>
					<Button
						size='sm'
						variant='soft'
						color='primary'
						onClick={() => void exportCalendar()}
						startDecorator={<ArrowUpTrayIcon className='h-4 w-4' />}
						disabled={selectedCourses.length === 0}
						sx={{ mr: 1 }}
					>
						Export Calendar
					</Button>
				</div>
				<div className={styles.content}>
					<Virtuoso
						data={uniqueCourses}
						itemContent={(_, course) => (
							<div className={styles.item} key={course.course.guid}>
								<SortableCalendarItem course={course.course} isSelectedCourseItem />
							</div>
						)}
					/>
				</div>
			</div>
			<Snackbar open={openSuccessSnackBar} onClose={() => setOpenSuccessSnackBar(false)}>
				<Alert onClose={() => setOpenSuccessSnackBar(false)} severity='success' variant='filled'>
					Successfully exported your calendar!
				</Alert>
			</Snackbar>
			<Snackbar open={openErrorSnackBar} onClose={() => setOpenErrorSnackBar(false)}>
				<Alert onClose={() => setOpenErrorSnackBar(false)} severity='error' variant='filled'>
					{!termFilter
						? 'Please select a term before exporting your calendar.'
						: 'Please select course times before exporting your calendar.'}
				</Alert>
			</Snackbar>
		</>
	);
};
