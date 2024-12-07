import type { CSSProperties, HTMLAttributes } from 'react';
import { forwardRef } from 'react'; // todo: not needed in react19

import { cn } from '@/lib/utils';

import styles from './Action.module.css';

export type ActionProps = HTMLAttributes<HTMLButtonElement> & {
	active?: {
		fill: string;
		background: string;
	};
	cursor?: CSSProperties['cursor'];
};

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
	({ active, className, cursor, style, ...props }, ref) => {
		const customStyle: CSSProperties = {
			...style,
			cursor,
			...(active && {
				'--fill': active.fill,
				'--background': active.background,
			}),
		};

		return (
			<button
				ref={ref}
				{...props}
				className={cn(styles.Action, className)}
				tabIndex={0}
				style={customStyle}
			/>
		);
	}
);

Action.displayName = 'Action';
