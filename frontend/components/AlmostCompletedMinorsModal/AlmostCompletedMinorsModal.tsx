import { useState, useMemo, useEffect } from 'react';

import { Snackbar } from '@mui/joy';

import { Modal } from '@/components/Modal';
import { getAlmostCompletedPrograms, type Program } from '@/services/almostCompletedService';
import { getProgramDetails, type ProgramDetails } from '@/services/programDetailsService';
import useUserSlice from '@/store/userSlice';
import type { MajorMinorType } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';

import { MinorsList } from './MinorsList';
import { ProgramDetailsPanel } from './ProgramDetailsPanel';

/**
 * Hook to open the "Almost Completed Minors" modal.
 * Returns an open function and the modal element to render.
 */
export function useAlmostCompletedMinorsModal() {
	const [isOpen, setIsOpen] = useState(false);
	const profile = useUserSlice((state) => state.profile);
	const updateProfile = useUserSlice((state) => state.updateProfile);
	const updateRequirements = useUserSlice((state) => state.updateRequirements);

	const openAlmostCompletedMinorsModal = () => setIsOpen(true);

	// Search state and minors list
	const [query, setQuery] = useState('');
	const [minors, setMinors] = useState<Program[]>([]);
	const [openSnackbar, setOpenSnackbar] = useState(false);
	const [csrfToken, setCsrfToken] = useState('');
	const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
	const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(null);
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [loadingPrograms, setLoadingPrograms] = useState(false);

	// Fetch CSRF token on mount
	useEffect(() => {
		void (async () => {
			const token = await fetchCsrfToken();
			setCsrfToken(token);
		})();
	}, []);

	// Check if a minor is already in the user's profile
	const isMinorAdded = (code: string) => {
		return profile.minors?.some((minor) => minor.code === code) ?? false;
	};

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		// Fetch almost-completed programs from backend API
		const fetchPrograms = async () => {
			setLoadingPrograms(true);
			const programs = await getAlmostCompletedPrograms();
			setMinors(programs ?? []);
			setLoadingPrograms(false);
		};

		void fetchPrograms();
	}, [isOpen]);

	// Reset state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedProgram(null);
			setProgramDetails(null);
			setQuery('');
			setOpenSnackbar(false);
		}
	}, [isOpen]);

	// Handle adding/removing a minor
	const handleToggleMinor = async (minorCode: string, minorName: string) => {
		const currentMinors = profile.minors || [];
		const isAdded = isMinorAdded(minorCode);

		let newMinors: MajorMinorType[];
		if (isAdded) {
			newMinors = currentMinors.filter((m) => m.code !== minorCode);
		} else {
			if (currentMinors.length >= 3) {
				setOpenSnackbar(true);
				return;
			}
			newMinors = [...currentMinors, { code: minorCode, name: minorName }];
		}

		try {
			const updatedProfile = {
				...profile,
				minors: newMinors,
			};

			const response = await fetch(`/api/hoagie/profile/update`, {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrfToken,
				},
				body: JSON.stringify(updatedProfile),
			});

			if (!response.ok) {
				throw new Error('Failed to update profile');
			}

			updateProfile({ minors: newMinors });
			await updateRequirements();
		} catch (error) {
			console.error('Error updating minors:', error);
		}
	};

	const handleCloseSnackbar = () => {
		setOpenSnackbar(false);
	};

	const handleShowProgramDetails = async (program: Program) => {
		setSelectedProgram(program);
		setLoadingDetails(true);
		setProgramDetails(null);

		const details = await getProgramDetails(program.code);
		setProgramDetails(details);
		setLoadingDetails(false);
	};

	const handleCloseProgramDetails = () => {
		setSelectedProgram(null);
		setProgramDetails(null);
	};

	const filteredMinors = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return minors;
		}
		return minors.filter(
			(m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
		);
	}, [query, minors]);

	/*
	const getPrereqClass = (prereq: boolean | null) => {
		if (prereq === true) {
			return 'inline-block rounded-full px-3 py-1 text-xs text-white';
		}
		if (prereq === false) {
			return 'inline-block rounded-full bg-red-500 px-3 py-1 text-xs text-white';
		}
		return 'inline-block rounded-full bg-gray-300 px-3 py-1 text-xs text-gray-700';
	};

	const getPrereqText = (prereq: boolean | null) => {
		if (prereq === true) {
			return 'Prerequisites Fulfilled';
		}
		if (prereq === false) {
			return 'Prerequisites Not Fulfilled';
		}
		return 'No Prerequisites';
	};
	*/

	if (!isOpen) {
		return { openAlmostCompletedMinorsModal, almostCompletedModal: null };
	}

	const almostCompletedModal = (
		<Modal className='w-11/12 max-w-6xl p-6' onClose={() => setIsOpen(false)}>
			<div className='flex flex-row gap-6' style={{ height: '640px' }}>
				{/* Left column: list of suggested minors/certificates */}
				<MinorsList
					query={query}
					onQueryChange={setQuery}
					filteredMinors={filteredMinors}
					loadingPrograms={loadingPrograms}
					isMinorAdded={isMinorAdded}
					onToggleMinor={handleToggleMinor}
					onShowProgramDetails={handleShowProgramDetails}
				/>

				{/* Right column: illustration + info OR program details */}
				<div className='flex flex-1 flex-col border-l px-8'>
					<ProgramDetailsPanel
						selectedProgram={selectedProgram}
						programDetails={programDetails}
						loadingDetails={loadingDetails}
						onClose={handleCloseProgramDetails}
						onCloseModal={() => setIsOpen(false)}
					/>
				</div>
			</div>
			<Snackbar
				open={openSnackbar}
				color='primary'
				variant='soft'
				onClose={handleCloseSnackbar}
				autoHideDuration={6000}
				sx={{
					'.MuiSnackbar-root': {
						borderRadius: '16px',
					},
					backgroundColor: '#0F1E2F',
					color: '#f6f6f6',
				}}
			>
				<div className='text-center'>You can only minor in two programs and plan up to three.</div>
			</Snackbar>
		</Modal>
	);

	return { openAlmostCompletedMinorsModal, almostCompletedModal };
}

export default useAlmostCompletedMinorsModal;
