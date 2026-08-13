import type { FC } from 'react';

interface RecentSearchesProps {
	searches: string[];
	onSearch: (search: string) => void;
	onClear: () => void;
}

export const RecentSearches: FC<RecentSearchesProps> = ({ searches, onSearch, onClear }) => (
	<div className='mt-3'>
		{/* Recent searches and clear button */}
		<div className='mb-2 flex items-center justify-between'>
			<div className='text-sm text-gray-500'>Recent searches:</div>
			<button
				className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-200 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-300'
				onClick={onClear}
			>
				Clear
			</button>
		</div>
		{/* Recent search items */}
		<div className='flex flex-wrap gap-2 pb-2'>
			{searches.map((search, index) => (
				<button
					key={index}
					className='max-w-[120px] truncate rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300'
					title={search}
					onClick={() => onSearch(search)}
				>
					{search}
				</button>
			))}
		</div>
	</div>
);
