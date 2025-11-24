import { useState, useMemo } from 'react';

import Image from 'next/image';

import { Modal } from '@/components/Modal';

const INITIAL_MINORS = [
	{
		code: 'ODQS',
		name: 'Optimization and Quantitative Decision Science',
		prereqFulfilled: true,
		independentWorkRequired: true,
		remaining: '0/5',
	},
	{
		code: 'UASM',
		name: 'Asian American Studies',
		prereqFulfilled: true,
		independentWorkRequired: true,
		remaining: '0/5',
	},
	{
		code: 'SML',
		name: 'Statistics and Machine Learning',
		prereqFulfilled: false,
		independentWorkRequired: false,
		remaining: '2/4',
	},
];

/**
 * Hook to open the "Almost Completed Minors" modal.
 * Returns an open function and the modal element to render.
 */
export function useAlmostCompletedMinorsModal() {
	const [isOpen, setIsOpen] = useState(false);

	const openAlmostCompletedMinorsModal = () => setIsOpen(true);

	// Search state and sample minors list
	const [query, setQuery] = useState('');

	const [addedMap, setAddedMap] = useState<Record<string, boolean>>({
		ODQS: true,
		UASM: false,
		SML: false,
	});

	const filteredMinors = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return INITIAL_MINORS;
		}
		return INITIAL_MINORS.filter(
			(m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
		);
	}, [query]);

	const almostCompletedModal = isOpen ? (
		<Modal className='w-11/12 max-w-6xl p-6'>
			<div className='flex flex-row gap-6'>
				{/* Left column: list of suggested minors/certificates */}
				<div className='max-h-[60vh] w-1/2 overflow-y-auto pr-4'>
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

					{/* Scrollable list of suggested minors */}
					<div className='space-y-4'>
						{/* Use a static list for now; we filter client-side */}
						{filteredMinors.map((m) => (
							<div key={m.code} className='rounded-md border bg-white p-4 shadow-sm'>
								<div className='flex items-center justify-between'>
									<div>
										<div className='text-lg font-semibold'>{m.code}</div>
										<div className='text-sm text-gray-600'>{m.name}</div>
									</div>
									{addedMap[m.code] ? (
										<div className='text-sm text-gray-500'>Added</div>
									) : (
										<button
											className='rounded bg-blue-500 px-3 py-1 text-sm text-white'
											onClick={() => setAddedMap((prev) => ({ ...prev, [m.code]: true }))}
										>
											Add
										</button>
									)}
								</div>
								<div className='mt-3'>
									<div
										className={
											m.prereqFulfilled
												? 'mr-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs text-green-800'
												: 'mr-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs text-red-800'
										}
									>
										{m.prereqFulfilled ? 'Prerequisites Fulfilled' : 'Prerequisites Not Fulfilled'}
									</div>
									<div className='inline-block rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-800'>
										{m.independentWorkRequired
											? 'Independent Work Required'
											: 'Independent Work Not Required'}
									</div>
									<div className='mt-3 text-sm text-gray-600'>{m.remaining} Remaining Courses</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right column: illustration + info */}
				<div className='flex w-1/2 flex-col items-center justify-center'>
					<div className='h-81 w-81 flex items-center justify-center bg-white'>
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
							Click <span className='inline-block rounded-full bg-gray-200 px-2 py-1'>i</span> for
							more info on minors and certificates
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
			</div>
		</Modal>
	) : null;

	return { openAlmostCompletedMinorsModal, almostCompletedModal };
}

export default useAlmostCompletedMinorsModal;
