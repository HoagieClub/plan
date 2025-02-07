import type { ReactNode } from 'react';

import classNames from 'classnames';

import styles from './FloatingControls.module.css';

export type FloatingControlsProps = {
  children: ReactNode;
};

export function FloatingControls({ children }: FloatingControlsProps) {
  return <div className={classNames(styles.FloatingControls)}>{children}</div>;
}
