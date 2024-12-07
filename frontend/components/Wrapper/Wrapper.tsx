import { type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import styles from './Wrapper.module.css';

type Props = {
	children: ReactNode;
	center?: boolean;
	style?: CSSProperties;
};

export function Wrapper({ children, center, style }: Props) {
	return (
		<div className={cn(styles.Wrapper, center && styles.center)} style={style}>
			{children}
		</div>
	);
}
