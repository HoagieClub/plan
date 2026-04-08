import type { CSSProperties, FC, ReactNode } from 'react';

interface CourseDetailSectionProps {
	children: ReactNode;
	style?: CSSProperties;
}

export const CourseDetailSection: FC<CourseDetailSectionProps> = ({ children, style }) => (
	<div
		style={{
			backgroundColor: '#F5F5F5',
			borderRadius: '6px',
			overflow: 'hidden',
			padding: '8px 12px',
			...style,
		}}
	>
		{children}
	</div>
);
