import { Snowflake, SunSnowIcon, Sun } from 'lucide-react';

interface SemesterTagProps {
	semester: 'Fall' | 'Spring' | 'Summer' | 'Multiple';
	year?: number;
}

const COLORS: Record<SemesterTagProps['semester'], string> = {
	Spring: '#f0a030',
	Summer: '#f0a030',
	Fall: '#47aad4',
	Multiple: '#7c3aed',
};

export default function SemesterTag({ semester, year }: SemesterTagProps) {
	const bg = COLORS[semester];

	let icon;
	if (semester === 'Multiple') {
		icon = <SunSnowIcon size={18} color='white' />;
	} else if (semester === 'Fall') {
		icon = <Snowflake size={18} color='white' />;
	} else {
		icon = <Sun size={18} color='white' />;
	}

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '7px',
				backgroundColor: bg,
				borderRadius: '8px',
				padding: '4px 8px',
				color: 'white',
				fontWeight: 600,
				fontSize: '0.85rem',
				whiteSpace: 'nowrap',
				flexShrink: 0,
			}}
		>
			{icon}
			<span>
				{semester}
				{year ? ` ${year}` : ''}
			</span>
		</div>
	);
}
