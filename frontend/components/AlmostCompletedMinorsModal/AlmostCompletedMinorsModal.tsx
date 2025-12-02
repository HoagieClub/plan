import { useState, useMemo, useEffect } from 'react';

import { Snackbar } from '@mui/joy';

import { Modal } from '@/components/Modal';
import { getAlmostCompletedPrograms, type Program } from '@/services/almostCompletedService';
import { getProgramDetails, type ProgramDetails } from '@/services/programDetailsService';
import useUserSlice from '@/store/userSlice';
import type { MajorMinorType } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';
import { CERTIFICATE_OPTIONS, MINOR_OPTIONS } from '@/utils/programs';

import { MinorDetailsPanel } from './MinorDetailsPanel';
import { MinorsList } from './MinorsList';

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
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

	// Check if a cert is already in the user's profile
	const isCertAdded = (code: string) => {
		return profile.certificates?.some((cert) => cert.code === code) ?? false;
	};

	// Check if a program (minor or cert) is already added
	const isProgramAdded = (code: string) => {
		return isMinorAdded(code) || isCertAdded(code);
	};

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		// Fetch almost-completed programs from backend API
		const fetchPrograms = async () => {
			setLoadingPrograms(true);
			setErrorMessage(null);
			const result = await getAlmostCompletedPrograms();

			if (result.success === true) {
				setMinors(result.programs);
			} else {
				setMinors([]);
				setErrorMessage(result.error);
			}

			setLoadingPrograms(false);
		};

		void fetchPrograms();
	}, [isOpen]);

	// Reset state when modal closes and handle escape key
	useEffect(() => {
		if (!isOpen) {
			setSelectedProgram(null);
			setProgramDetails(null);
			setQuery('');
			setOpenSnackbar(false);
			setErrorMessage(null);
			return;
		}

		// Press escape key to close modal
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen]);

	// Handle adding/removing a minor/cert
	const handleToggleMinor = async (programCode: string, programName: string) => {
		// Determine program type
		const isMinor = MINOR_OPTIONS.some((minor) => minor.code === programCode);
		const isCert = CERTIFICATE_OPTIONS.some((cert) => cert.code === programCode);

		// If the program is neither a minor nor a cert, return
		if (!isMinor && !isCert) {
			return;
		}

		// Determine which profile field to update
		const fieldName = isMinor ? 'minors' : 'certificates';
		const currentItems = (profile[fieldName] || []) as MajorMinorType[];
		const isAdded = currentItems.some((item) => item.code === programCode);

		// Calculate new items array
		let newItems: MajorMinorType[];
		if (isAdded) {
			newItems = currentItems.filter((item) => item.code !== programCode);
		} else {
			if (currentItems.length >= 3) {
				setOpenSnackbar(true);
				return;
			}
			newItems = [...currentItems, { code: programCode, name: programName }];
		}

		// Prepare profile updates
		const updatedProfile = {
			...profile,
			[fieldName]: newItems,
		};
		const newProfile = { [fieldName]: newItems };

		try {
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
			updateProfile(newProfile);
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
		<Modal className='relative w-11/12 max-w-6xl p-6' onClose={() => setIsOpen(false)}>
			{/* Close button at top right corner */}
			<button
				className='absolute right-4 top-4 z-10 rounded-full p-1 hover:bg-gray-100'
				onClick={() => setIsOpen(false)}
				aria-label='Close modal'
			>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='24'
					height='24'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
				>
					<line x1='18' y1='6' x2='6' y2='18' />
					<line x1='6' y1='6' x2='18' y2='18' />
				</svg>
			</button>
			<div className='flex flex-row gap-6' style={{ height: '640px' }}>
				{/* Left column: list of suggested minors/certificates */}
				<MinorsList
					query={query}
					onQueryChange={setQuery}
					filteredMinors={filteredMinors}
					loadingPrograms={loadingPrograms}
					isMinorAdded={isProgramAdded}
					onToggleMinor={handleToggleMinor}
					onShowProgramDetails={handleShowProgramDetails}
					errorMessage={errorMessage}
					selectedProgram={selectedProgram}
				/>

				{/* Right column: illustration + info OR program details */}
				<MinorDetailsPanel
					selectedProgram={selectedProgram}
					programDetails={programDetails}
					loadingDetails={loadingDetails}
					onClose={handleCloseProgramDetails}
					onCloseModal={() => setIsOpen(false)}
				/>
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
