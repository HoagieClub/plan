import Image from 'next/image';

import type { Program } from '@/services/almostCompletedService';
import type { ProgramDetails } from '@/services/programDetailsService';

interface MinorDetailsPanelProps {
	selectedProgram: Program | null;
	programDetails: ProgramDetails | null;
	loadingDetails: boolean;
	onClose: () => void;
	onCloseModal: () => void;
}

export function MinorDetailsPanel({
	selectedProgram,
	programDetails,
	loadingDetails,
	onClose,
	onCloseModal,
}: MinorDetailsPanelProps) {
	if (!selectedProgram) {
		return (
			<div className='flex flex-1 flex-col border-l px-8'>
				<div className='flex h-full flex-col items-center justify-center'>
					<div className='flex h-80 w-full items-center justify-center bg-white'>
						<div className='flex h-full w-full items-center justify-center rounded-lg'>
							<Image
								src='/MinorsIcon.svg'
								alt='Minors illustration'
								width={320}
								height={320}
								className='object-contain'
							/>
						</div>
					</div>
					<div className='mt-6 text-center'>
						<div className='text-xl font-semibold'>
							Click{' '}
							<span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200'>
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
							</span>{' '}
							for more info on minors and certificates
						</div>
					</div>
					<div className='mt-6'>
						<button className='rounded bg-gray-800 px-4 py-2 text-white' onClick={onCloseModal}>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex flex-1 flex-col border-l px-8'>
			<div className='flex h-full flex-col overflow-y-auto py-6'>
				<div className='mb-4 flex items-start justify-between'>
					<div>
						<h2 className='text-2xl font-bold'>{selectedProgram.name}</h2>
						{programDetails?.urls && programDetails.urls.length > 0 ? (
							<a
								href={programDetails.urls[0]}
								target='_blank'
								rel='noopener noreferrer'
								className='mt-1 flex items-center gap-1.5 text-sm text-blue-600 hover:underline'
							>
								{selectedProgram.code}
								<svg
									xmlns='http://www.w3.org/2000/svg'
									width='14'
									height='14'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'
								>
									<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
									<polyline points='15 3 21 3 21 9' />
									<line x1='10' y1='14' x2='21' y2='3' />
								</svg>
							</a>
						) : (
							<div className='mt-1 text-sm text-gray-500'>{selectedProgram.code}</div>
						)}
					</div>
					<button className='rounded-full p-1 hover:bg-gray-100' onClick={onClose}>
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
						{/* Progress info */}
						<div className='mb-6'>
							<div className='flex items-center gap-2 text-sm'>
								<span className='font-semibold text-gray-700'>Status:</span>
								<span className='text-gray-600'>
									{(() => {
										if (selectedProgram.needed === 0) {
											return <span className='font-semibold text-green-600'>Completed!</span>;
										}
										if (selectedProgram.needed === 1) {
											return <span>1 more course needed</span>;
										}
										return <span>{selectedProgram.needed} more courses needed</span>;
									})()}
								</span>
							</div>
							{selectedProgram.incompleteRequirements &&
								selectedProgram.incompleteRequirements.length > 0 && (
									<div className='mt-3 space-y-2'>
										<div className='text-xs font-semibold text-gray-700'>
											Incomplete requirements:
										</div>
										{selectedProgram.incompleteRequirements.map((req, idx) => (
											<div
												key={idx}
												className='flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2'
											>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='14'
													height='14'
													viewBox='0 0 24 24'
													fill='none'
													stroke='currentColor'
													strokeWidth='2'
													className='mt-0.5 flex-shrink-0 text-amber-600'
												>
													<circle cx='12' cy='12' r='10' />
													<line x1='12' y1='8' x2='12' y2='12' />
													<line x1='12' y1='16' x2='12.01' y2='16' />
												</svg>
												<span className='text-xs text-gray-700'>{req}</span>
											</div>
										))}
									</div>
								)}
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
								<div
									className='rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700'
									dangerouslySetInnerHTML={{ __html: programDetails.description }}
								/>
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
											<div className='mt-1 text-sm font-medium text-gray-900'>{contact.name}</div>
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
												<div
													className='text-xs leading-relaxed text-gray-600'
													dangerouslySetInnerHTML={{ __html: req.explanation }}
												/>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
