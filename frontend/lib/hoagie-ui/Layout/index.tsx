/**
 * @overview Global pane layout to be used in @/app/layout.tsx
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

import type { FC, ReactNode } from 'react';

import { Pane } from 'evergreen-ui';

import { Footer } from '@/lib/hoagie-ui/Footer';
import { hoagieUI } from '@/lib/hoagie-ui/Theme/themes';

interface LayoutProps {
	children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
	const theme = hoagieUI;

	return (
		<Pane
			display='flex'
			flexDirection='column'
			minHeight='100vh'
			background={theme.colors.slate160}
		>
			<Pane flex={1}>{children}</Pane>
			<Footer />
		</Pane>
	);
};
