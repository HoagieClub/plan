import { useEffect, useRef, useState, type FC } from 'react';

interface AISummaryProps {
	summary: string;
}

const COLLAPSED_HEIGHT = 'calc(3 * 1.5 * 0.85rem)';

export const AISummary: FC<AISummaryProps> = ({ summary }) => {
	const [expanded, setExpanded] = useState(false);
	const [overflows, setOverflows] = useState(false);
	const [fullHeight, setFullHeight] = useState<string>('1000px');
	const [hovered, setHovered] = useState(false);
	const textRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = textRef.current;
		if (el) {
			setFullHeight(`${el.scrollHeight}px`);
			setOverflows(el.scrollHeight > el.clientHeight);
		}
	}, [summary]);

	if (!summary) return null;

	return (
		<div
			style={{
				paddingBottom: '12px',
				marginBottom: '12px',
				borderBottom: '1px solid #ccc',
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '4px',
					marginBottom: '4px',
				}}
			>
				<span style={{
					color: '#663399',
					fontSize: '0.85rem',
					display: 'inline-block',
					transform: hovered ? 'rotate(180deg)' : 'rotate(0deg)',
					transition: 'transform 0.3s ease',
				}}>✦</span>
				<strong style={{ color: '#663399', fontSize: '0.85rem' }}>Summary</strong>
				<span
					style={{
						marginLeft: 'auto',
						backgroundColor: '#c49de0',
						color: 'white',
						fontSize: '0.65rem',
						fontWeight: 600,
						padding: '1px 6px',
						borderRadius: '4px',
						letterSpacing: '0.05em',
					}}
				>
					BETA
				</span>
			</div>
			<div
				ref={textRef}
				onClick={() => (overflows || expanded) && setExpanded((e) => !e)}
				style={{
					fontSize: '0.85rem',
					lineHeight: '1.5',
					fontStyle: 'italic',
					color: '#663399',
					overflow: 'hidden',
					maxHeight: expanded ? fullHeight : COLLAPSED_HEIGHT,
					transition: 'max-height 0.3s ease',
					cursor: 'default',
				}}
			>
				{summary}
			</div>
			{(overflows || expanded) && (
				<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
					<button
						onClick={() => setExpanded((e) => !e)}
						style={{
							marginTop: '4px',
							background: 'none',
							border: 'none',
							borderTop: '1px solid #663399',
							padding: '4px 0 2px',
							color: '#663399',
							fontSize: '0.75rem',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						{expanded ? 'Show less' : 'Show more'}
					</button>
				</div>
			)}
		</div>
	);
};
