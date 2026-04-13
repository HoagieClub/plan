import type { FC } from 'react';

interface SectionTitleProps {
	label: string;
	iconSrc: string;
}

export const SectionTitle: FC<SectionTitleProps> = ({ label, iconSrc }) => (
	<div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 6px' }}>
		<img src={iconSrc} alt='' style={{ width: '16px', height: '16px', opacity: 0.55 }} />
		<span
			style={{
				color: '#8b8b8b',
				fontSize: '0.95rem',
				fontWeight: 500,
			}}
		>
			{label}
		</span>
	</div>
);
