import { useState, useMemo, useEffect } from 'react';

import { Snackbar } from '@mui/joy';
import Image from 'next/image';

import { Modal } from '@/components/Modal';
import useUserSlice from '@/store/userSlice';
import type { MajorMinorType } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';

type Program = {
	code: string;
	name: string;
	needed: number;
	count: number;
	min_needed: number;
	type: string;
	prereqFulfilled: boolean | null;
	independentWorkRequired: boolean;
};

type ProgramRequirement = {
	name: string;
	explanation?: string;
	min_needed?: string | number;
};

type ProgramDetails = {
	code: string;
	name: string;
	type: string;
	description: string;
	urls: string[];
	contacts: Array<{
		type: string;
		name: string;
		email?: string;
	}>;
	requirements: ProgramRequirement[];
};

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
		void fetch('/api/hoagie/almost_completed/', { credentials: 'include' })
			.then((res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				return res.json();
			})
			.then((data) => {
				if (data && Array.isArray(data.programs)) {
					const mapped = data.programs.map(
						(p: {
							code: string;
							name: string;
							needed: number;
							count: number;
							min_needed: number;
							type: string;
							prereqFulfilled?: boolean | null;
							independentWorkRequired?: boolean;
						}) => ({
							code: p.code,
							name: p.name,
							needed: p.needed,
							count: p.count,
							min_needed: p.min_needed,
							type: p.type,
							prereqFulfilled: p.prereqFulfilled,
							independentWorkRequired: p.independentWorkRequired ?? false,
						})
					);
					setMinors(mapped);
				}
			})
			.catch(() => {
				setMinors([]);
			});
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

		try {
			const response = await fetch(`/api/hoagie/program_details/${program.code}/`, {
				credentials: 'include',
			});
			if (response.ok) {
				const data = await response.json();
				setProgramDetails(data as ProgramDetails);
			}
		} catch (error) {
			console.error('Failed to fetch program details:', error);
		} finally {
			setLoadingDetails(false);
		}
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

	const almostCompletedModal = isOpen ? (
		<Modal className='w-11/12 max-w-6xl p-6'>
			<div className='flex flex-row gap-6' style={{ height: '640px' }}>
				{/* Left column: list of suggested minors/certificates */}
				<div className='flex w-1/2 flex-col pr-4'>
					<div className='mb-4'>
						<h2 className='text-2xl font-bold'>Minors and Certificates</h2>
						<div className='text-sm text-gray-600'>
							The following are your suggested minors and certificates.
						</div>
					</div>

					<div className='mb-4'>
						<input
							type='search'
							placeholder='Search here'
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className='w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none'
						/>
					</div>

					{/* Scrollable list - height for approximately 3 items */}
					<div className='flex-1 space-y-4 overflow-y-auto pr-2'>
						{filteredMinors.map((m) => (
							<div key={m.code} className='rounded-md border bg-white p-4 shadow-sm'>
								<div className='flex items-center justify-between'>
									<div>
										<div className='text-lg font-semibold'>{m.code}</div>
										<div className='text-sm text-gray-600'>{m.name}</div>
									</div>
									<div className='flex items-center gap-2'>
										<button
											className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200'
											onClick={() => handleShowProgramDetails(m)}
											title='Show program details'
										>
											<svg
												xmlns='http://www.w3.org/2000/svg'
												width='16'
												height='16'
												viewBox='0 0 24 24'
												fill='none'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											>
												<circle cx='12' cy='12' r='10' />
												<line x1='12' y1='16' x2='12' y2='12' />
												<line x1='12' y1='8' x2='12.01' y2='8' />
											</svg>
										</button>
										{isMinorAdded(m.code) ? (
											<button
												className='cursor-pointer rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400'
												onClick={() => handleToggleMinor(m.code, m.name)}
											>
												Added
											</button>
										) : (
											<button
												className='rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600'
												onClick={() => handleToggleMinor(m.code, m.name)}
											>
												Add
											</button>
										)}
									</div>
								</div>

								{/* Progress bar */}
								<div className='mb-3 mt-3'>
									<div className='mb-1 flex items-center justify-between text-xs text-gray-600'>
										<span>Progress</span>
										<span>
											{m.count} / {m.min_needed} courses
										</span>
									</div>
									<div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
										<div
											className='h-full transition-all'
											style={{
												width: `${m.min_needed > 0 ? Math.max(0, Math.min(100, (m.count / m.min_needed) * 100)) : 0}%`,
												backgroundColor: '#56a265',
											}}
										/>
									</div>
								</div>

								<div className='mt-3 flex flex-wrap gap-2'>
									<div
										className={getPrereqClass(m.prereqFulfilled)}
										style={m.prereqFulfilled === true ? { backgroundColor: '#56a265' } : {}}
									>
										{getPrereqText(m.prereqFulfilled)}
									</div>
									<div
										className={
											m.independentWorkRequired
												? 'inline-block rounded-full bg-gray-700 px-3 py-1 text-xs text-white'
												: 'inline-block rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700'
										}
									>
										{m.independentWorkRequired
											? 'Independent Work Required'
											: 'Independent Work Not Required'}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right column: illustration + info OR program details */}
				<div className='flex flex-1 flex-col border-l px-8'>
					{selectedProgram ? (
						<div className='flex h-full flex-col overflow-y-auto py-6'>
							<div className='mb-4 flex items-start justify-between'>
								<div>
									<h2 className='text-2xl font-bold'>{selectedProgram.name}</h2>
									{programDetails?.urls && programDetails.urls.length > 0 ? (
										<a
											href={programDetails.urls[0]}
											target='_blank'
											rel='noopener noreferrer'
											className='mt-1 text-sm text-blue-600 hover:underline'
										>
											{selectedProgram.code}
										</a>
									) : (
										<div className='mt-1 text-sm text-gray-500'>{selectedProgram.code}</div>
									)}
								</div>
								<button
									className='rounded-full p-1 hover:bg-gray-100'
									onClick={handleCloseProgramDetails}
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
							</div>

							{loadingDetails && (
								<div className='flex items-center justify-center py-8'>
									<div className='text-gray-500'>Loading program details...</div>
								</div>
							)}

							{!loadingDetails && programDetails && (
								<>
									{/* Progress bar */}
									<div className='mb-6'>
										<div className='mb-2 flex items-center justify-between text-sm'>
											<span className='font-semibold text-gray-700'>Progress</span>
											<span className='text-gray-600'>
												{selectedProgram.count} / {selectedProgram.min_needed} courses (
												{selectedProgram.needed} more needed)
											</span>
										</div>
										<div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
											<div
												className='h-full transition-all'
												style={{
													width: `${
														selectedProgram.min_needed > 0
															? Math.max(
																	0,
																	Math.min(
																		100,
																		(selectedProgram.count / selectedProgram.min_needed) * 100
																	)
																)
															: 0
													}%`,
													backgroundColor: '#56a265',
												}}
											/>
										</div>
									</div>

									{/* Description */}
									{programDetails.description && (
										<div className='mb-6'>
											<div className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='16'
													height='16'
													viewBox='0 0 24 24'
													fill='none'
													stroke='currentColor'
													strokeWidth='2'
												>
													<path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' />
													<polyline points='13 2 13 9 20 9' />
												</svg>
												Description
											</div>
											<div className='rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700'>
												{programDetails.description}
											</div>
										</div>
									)}

									{/* Contacts / Advisors */}
									{programDetails.contacts && programDetails.contacts.length > 0 && (
										<div className='mb-6'>
											<div className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='16'
													height='16'
													viewBox='0 0 24 24'
													fill='none'
													stroke='currentColor'
													strokeWidth='2'
												>
													<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
													<circle cx='9' cy='7' r='4' />
													<path d='M23 21v-2a4 4 0 0 0-3-3.87' />
													<path d='M16 3.13a4 4 0 0 1 0 7.75' />
												</svg>
												Advisors & Contacts
											</div>
											<div className='space-y-3 rounded-lg bg-gray-50 p-4'>
												{programDetails.contacts.map((contact, index) => (
													<div
														key={index}
														className='border-b border-gray-200 pb-3 last:border-b-0 last:pb-0'
													>
														<div className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
															{contact.type}
														</div>
														<div className='mt-1 text-sm font-medium text-gray-900'>
															{contact.name}
														</div>
														{contact.email && (
															<a
																href={`mailto:${contact.email}`}
																className='mt-1 block text-xs text-blue-600 hover:underline'
															>
																{contact.email}
															</a>
														)}
													</div>
												))}
											</div>
										</div>
									)}

									{/* Program Requirements */}
									{programDetails.requirements && programDetails.requirements.length > 0 && (
										<div className='mb-6'>
											<div className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='16'
													height='16'
													viewBox='0 0 24 24'
													fill='none'
													stroke='currentColor'
													strokeWidth='2'
												>
													<path d='M9 11l3 3L22 4' />
													<path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' />
												</svg>
												Program Requirements
											</div>
											<div className='space-y-3'>
												{programDetails.requirements.map((req, index: number) => (
													<div key={index} className='rounded-lg bg-gray-50 p-4'>
														<div className='mb-2 text-sm font-medium text-gray-900'>{req.name}</div>
														{req.explanation && (
															<div className='text-xs leading-relaxed text-gray-600'>
																{req.explanation}
															</div>
														)}
														{req.min_needed && (
															<div className='mt-2 text-xs text-gray-500'>
																Minimum needed: {req.min_needed === 'ALL' ? 'All' : req.min_needed}
															</div>
														)}
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					) : (
						<div className='flex h-full flex-col items-center justify-center'>
							<div className='flex h-80 w-full items-center justify-center bg-white'>
								<div className='flex h-full w-full items-center justify-center rounded-lg'>
									<Image
										src='/MinorsIcon.png'
										alt='Minors illustration'
										width={160}
										height={160}
										className='object-contain'
									/>
								</div>
							</div>
							<div className='mt-6 text-center'>
								<div className='text-xl font-semibold'>
									Click <span className='inline-block rounded-full bg-gray-200 px-2 py-1'>i</span>{' '}
									for more info on minors and certificates
								</div>
							</div>
							<div className='mt-6'>
								<button
									className='rounded bg-gray-800 px-4 py-2 text-white'
									onClick={() => setIsOpen(false)}
								>
									Close
								</button>
							</div>
						</div>
					)}
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
	) : null;

	return { openAlmostCompletedMinorsModal, almostCompletedModal };
}

export default useAlmostCompletedMinorsModal;
