import type { Program } from '@/services/almostCompletedService';

interface MinorsListProps {
	query: string;
	onQueryChange: (query: string) => void;
	filteredMinors: Program[];
	loadingPrograms: boolean;
	isMinorAdded: (code: string) => boolean;
	onToggleMinor: (minorCode: string, minorName: string) => void;
	onShowProgramDetails: (program: Program) => void;
	errorMessage?: string | null;
	selectedProgram: Program | null;
}

export function MinorsList({
	query,
	onQueryChange,
	filteredMinors,
	loadingPrograms,
	isMinorAdded,
	onToggleMinor,
	onShowProgramDetails,
	errorMessage,
	selectedProgram,
}: MinorsListProps) {
	return (
		<div className='flex w-1/2 flex-col pr-4'>
			<div className='mb-3'>
				<h2 className='text-2xl font-bold'>Minors and Certificates</h2>
			</div>
			<div className='mb-4 rounded-md bg-red-50 p-2 text-xs'>
				Shows maximum courses needed for minors/certificates. Actual requirements may be lower. IW
				requirements excluded.
			</div>
			<div className='relative mb-4'>
				<input
					type='text'
					placeholder='Search here'
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					className='w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 text-sm focus:outline-none'
				/>
				{query && (
					<button
						onClick={() => onQueryChange('')}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
						title='Clear search'
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
							<line x1='18' y1='6' x2='6' y2='18' />
							<line x1='6' y1='6' x2='18' y2='18' />
						</svg>
					</button>
				)}
			</div>

			{/* Scrollable list - height for approximately 3 items */}
			<div className='flex-1 space-y-4 overflow-y-auto pr-2'>
				{/* Loading screen */}
				{loadingPrograms && (
					<div className='flex h-full items-center justify-center'>
						<div className='flex flex-col items-center gap-3'>
							<div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500' />
							<div className='text-sm text-gray-500'>Loading programs...</div>
						</div>
					</div>
				)}

				{/* Error message */}
				{!loadingPrograms && errorMessage && (
					<div className='flex h-full items-center justify-center'>
						<div className='rounded-lg border border-red-300 bg-red-50 p-6 text-center'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='mx-auto mb-3 h-12 w-12 text-red-500'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								strokeWidth={2}
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
								/>
							</svg>
							<h3 className='mb-2 text-lg font-semibold text-red-900'>Error Loading Programs</h3>
						</div>
					</div>
				)}

				{/* Success state */}
				{!loadingPrograms &&
					!errorMessage &&
					filteredMinors.length > 0 &&
					filteredMinors.map((m) => (
						<div
							key={m.code}
							className={`cursor-pointer rounded-md border-2 bg-white p-4 shadow-sm transition-all hover:bg-gray-50 ${
								selectedProgram?.code === m.code
									? 'border-blue-500'
									: 'border-transparent hover:border-gray-200'
							}`}
							onClick={() => onShowProgramDetails(m)}
						>
							<div className='flex items-center justify-between'>
								<div>
									<div className='text-lg font-semibold'>{m.code}</div>
									<div className='text-sm text-gray-600'>{m.name}</div>
								</div>
								<div className='flex items-center gap-2'>
									<button
										className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200'
										onClick={(e) => {
											e.stopPropagation();
											onShowProgramDetails(m);
										}}
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
											className='cursor-pointer rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 transition-all hover:bg-gray-400'
											onClick={(e) => {
												e.stopPropagation();
												onToggleMinor(m.code, m.name);
											}}
										>
											Added
										</button>
									) : (
										<button
											className='rounded bg-blue-500 px-3 py-1 text-sm text-white transition-all hover:bg-blue-600'
											onClick={(e) => {
												e.stopPropagation();
												onToggleMinor(m.code, m.name);
											}}
										>
											Add
										</button>
									)}
								</div>
							</div>

							{/* Progress info */}
							<div className='mt-3'>
								<div className='text-xs text-gray-600'>
									{(() => {
										if (m.needed === 0) {
											return <span className='font-semibold text-green-600'>Completed!</span>;
										}
										if (m.needed === 1) {
											return <span>1 more course needed</span>;
										}
										return <span>{m.needed} more courses needed</span>;
									})()}
								</div>
								{m.incompleteRequirements && m.incompleteRequirements.length > 0 && (
									<div className='mt-2 space-y-1'>
										{m.incompleteRequirements.map((req, idx) => (
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
							{/*
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
							*/}
						</div>
					))}
			</div>
		</div>
	);
}
