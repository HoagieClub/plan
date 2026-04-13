import { Snowflake, SunSnowIcon, Sun } from 'lucide-react';

export enum SemesterType {
	Fall = 'Fall',
	Spring = 'Spring',
	Summer = 'Summer',
	Multiple = 'Multiple',
}

interface SemesterTagProps {
	semester: SemesterType;
	year?: number;
}

function getSemesterIcon(semester: SemesterType) {
	if (semester === SemesterType.Multiple) {
		return <SunSnowIcon size={18} color='white' />;
	}
	if (semester === SemesterType.Fall) {
		return <Snowflake size={18} color='white' />;
	}
	return <Sun size={18} color='white' />;
}

const COLORS: Record<SemesterType, string> = {
	[SemesterType.Spring]: '#f0a030',
	[SemesterType.Summer]: '#f0a030',
	[SemesterType.Fall]: '#47aad4',
	[SemesterType.Multiple]: '#7c3aed',
};

export default function SemesterTag({ semester, year }: SemesterTagProps) {
	const bg = COLORS[semester];

	const icon = getSemesterIcon(semester);

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
