/**
 * @overview Theme component for the Hoagie Plan app.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from 'evergreen-ui';

import { hoagieYellow, hoagieUI } from './themes';

type ThemeProps = {
  // Options: "yellow"
  palette?: string;

  // React children (child components)
  children?: ReactNode;
};

/**
 * Returns a Hoagie theme based on the provided palette.
 *
 * @returns {ThemeProvider} A Hoagie-paletted theme provider component.
 */
function Theme({ palette = 'yellow', children }: ThemeProps) {
  const colorTheme = (() => {
    switch (palette) {
      case 'yellow':
        return hoagieYellow;
      default:
        return hoagieUI;
    }
  })();

  return <ThemeProvider value={colorTheme}>{children}</ThemeProvider>;
}

export default Theme;
