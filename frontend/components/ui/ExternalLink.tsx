import type { FC, ReactNode } from 'react';

interface ExternalLinkProps {
	href: string;
	children: ReactNode;
}

export const ExternalLink: FC<ExternalLinkProps> = ({ href, children }) => (
	<a
		href={href}
		target='_blank'
		rel='noopener noreferrer'
		className='transition-all duration-150 hover:brightness-90 active:scale-95'
		style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			padding: '4px 10px',
			minHeight: '40px',
			backgroundColor: '#d3d3d3',
			border: '1.5px solid #8b8b8b',
			borderRadius: '11px',
			color: 'black',
			fontSize: '0.72rem',
			fontWeight: 600,
			textDecoration: 'none',
			lineHeight: '1.25',
		}}
	>
		<span style={{ textAlign: 'center' }}>{children}</span>
	</a>
);
