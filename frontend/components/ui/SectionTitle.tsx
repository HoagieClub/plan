import type { FC } from 'react';

import Image from 'next/image';

interface SectionTitleProps {
	label: string;
	iconSrc: string;
}

export const SectionTitle: FC<SectionTitleProps> = ({ label, iconSrc }) => (
	<div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 6px' }}>
		<Image src={iconSrc} alt='' width={16} height={16} style={{ opacity: 0.55 }} />
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
