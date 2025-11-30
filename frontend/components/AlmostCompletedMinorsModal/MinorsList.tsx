import type { Program } from '@/services/almostCompletedService';

interface MinorsListProps {
	query: string;
	onQueryChange: (query: string) => void;
	filteredMinors: Program[];
	loadingPrograms: boolean;
	isMinorAdded: (code: string) => boolean;
	onToggleMinor: (minorCode: string, minorName: string) => void;
	onShowProgramDetails: (program: Program) => void;
}

export function MinorsList({
	query,
	onQueryChange,
	filteredMinors,
	loadingPrograms,
	isMinorAdded,
	onToggleMinor,
	onShowProgramDetails,
}: MinorsListProps) {
	return (
		<div className='flex w-1/2 flex-col pr-4'>
			<div className='mb-3'>
				<h2 className='text-2xl font-bold'>Minors and Certificates</h2>
			</div>
			<div className='mb-4 rounded-md bg-red-50 p-2 text-xs'>
				HoagiePlan displays the maximum number of courses you need to take to obtain the
				minor/cert, and the actual number of courses needed may be lower. IW requirements are
				not taken into account.
			</div>
			<div className='mb-4'>
				<input
					type='search'
					placeholder='Search here'
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					className='w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none'
				/>
			</div>

			{/* Scrollable list - height for approximately 3 items */}
			<div className='flex-1 space-y-4 overflow-y-auto pr-2'>
				{loadingPrograms ? (
					<div className='flex h-full items-center justify-center'>
						<div className='flex flex-col items-center gap-3'>
							<div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500' />
							<div className='text-sm text-gray-500'>Loading programs...</div>
						</div>
					</div>
				) : (
					filteredMinors.map((m) => (
						<div key={m.code} className='rounded-md border bg-white p-4 shadow-sm'>
							<div className='flex items-center justify-between'>
								<div>
									<div className='text-lg font-semibold'>{m.code}</div>
									<div className='text-sm text-gray-600'>{m.name}</div>
								</div>
								<div className='flex items-center gap-2'>
									<button
										className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200'
										onClick={() => onShowProgramDetails(m)}
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
											onClick={() => onToggleMinor(m.code, m.name)}
										>
											Added
										</button>
									) : (
										<button
											className='rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600'
											onClick={() => onToggleMinor(m.code, m.name)}
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
					))
				)}
			</div>
		</div>
	);
}
