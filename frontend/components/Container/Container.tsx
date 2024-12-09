import type { CSSProperties, HTMLAttributes, ReactNode, Ref, RefCallback } from 'react';
import { forwardRef } from 'react';

import classNames from 'classnames';

import styles from './Container.module.css';

export type ContainerProps = {
  children: ReactNode;
  columns?: number;
  label?: string | ReactNode;
  style?: CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  handleProps?: HTMLAttributes<HTMLDivElement | HTMLButtonElement>;
  scrollable?: boolean;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
  height?: string | number;
  onClick?(): void;
  onRemove?(): void;
};

export const Container = forwardRef<HTMLDivElement | HTMLButtonElement, ContainerProps>(
  (
    {
      children,
      columns = 1,
      // handleProps, // TODO: remove permanently?
      horizontal,
      hover,
      onClick,
      // onRemove, // TODO: remove permanently?
      label,
      placeholder,
      style,
      scrollable,
      shadow,
      unstyled,
      height,
      ...props
    }: ContainerProps,
    ref: Ref<HTMLDivElement | HTMLButtonElement>
  ) => {
    const Component = onClick ? 'button' : 'div';
    const setRef: RefCallback<HTMLDivElement | HTMLButtonElement> = (instance) => {
      if (typeof ref === 'function') {
        ref(instance);
      }
    };

    return (
      <Component
        {...props}
        ref={setRef}
        style={
          {
            ...style,
            '--columns': columns,
            height: height,
          } as CSSProperties
        }
        className={classNames(
          styles.Container,
          unstyled && styles.unstyled,
          horizontal && styles.horizontal,
          hover && styles.hover,
          placeholder && styles.placeholder,
          scrollable && styles.scrollable,
          shadow && styles.shadow
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label ? <div className={styles.Header}>{label}</div> : null}
        {placeholder ? children : <ul>{children}</ul>}
      </Component>
    );
  }
);

Container.displayName = 'Container';
