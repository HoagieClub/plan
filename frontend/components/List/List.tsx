import type { CSSProperties, ReactNode } from 'react';
import { forwardRef } from 'react'; // todo: not needed in react19

import { cn } from '@/lib/utils';

import styles from './List.module.css';

export type Props = {
	children: ReactNode;
	columns?: number;
	style?: CSSProperties;
	horizontal?: boolean;
};

export const List = forwardRef<HTMLUListElement, Props>(
	({ children, columns = 1, horizontal, style }: Props, ref) => {
		return (
			<ul
				ref={ref}
				style={
					{
						...style,
						'--columns': columns,
					} as CSSProperties
				}
				className={cn(styles.List, horizontal && styles.horizontal)}
			>
				{children}
			</ul>
		);
	}
);

List.displayName = 'List';
