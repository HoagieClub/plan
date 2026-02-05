// OpenInNewTabIcon.tsx
import React from 'react';

interface OpenInNewTabIconProps extends React.SVGProps<SVGSVGElement> {
	// Add any specific props if needed
}

const OpenInNewTabIcon: React.FC<OpenInNewTabIconProps> = ({ ...props }) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		viewBox='0 0 24 24' // Adjust viewBox based on your SVG
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
		{...props}
	>
		{/* Replace with your actual SVG path data for the icon */}
		<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
		<polyline points='15 3 21 3 21 9' />
		<line x1='10' y1='14' x2='21' y2='3' />
	</svg>
);

export default OpenInNewTabIcon;
