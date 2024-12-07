import type { HTMLAttributes, FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import styles from './Button.module.css';

export type Props = HTMLAttributes<HTMLButtonElement> & {
	children: ReactNode;
};

export const Button: FC<Props> = ({ children, ...props }) => {
	return (
		<button className={cn(styles.Button)} {...props}>
			{children}
		</button>
	);
};
