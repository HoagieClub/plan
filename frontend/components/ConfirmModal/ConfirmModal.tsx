import type { PropsWithChildren } from 'react';

import styles from './ConfirmModal.module.css';

type ConfirmProps = {
  onConfirm(): void;
  onDeny(): void;
};

export const ConfirmModal = ({ onConfirm, onDeny, children }: PropsWithChildren<ConfirmProps>) => (
  <div className={styles.ConfirmModal}>
    <h1>{children}</h1>
    <div>
      <button onClick={onConfirm}>Yes</button>
      <button onClick={onDeny}>No</button>
    </div>
  </div>
);
