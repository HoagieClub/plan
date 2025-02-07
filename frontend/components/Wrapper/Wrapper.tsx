import type { CSSProperties, ReactNode } from 'react';

import classNames from 'classnames';

import styles from './Wrapper.module.css';

type Props = {
  children: ReactNode;
  center?: boolean;
  style?: CSSProperties;
};

export function Wrapper({ children, center, style }: Props) {
  return (
    <div className={classNames(styles.Wrapper, center && styles.center)} style={style}>
      {children}
    </div>
  );
}
