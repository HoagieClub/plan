import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import styles from './FloatingControls.module.css';

export type FloatingControlsProps = {
	children: ReactNode;
};

export function FloatingControls({ children }: FloatingControlsProps) {
	return <div className={cn(styles.FloatingControls)}>{children}</div>;
}
