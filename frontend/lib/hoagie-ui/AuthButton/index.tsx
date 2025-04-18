/**
 * @overview AuthButton component for the Hoagie Plan app.
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import type { FC } from 'react';

import { Button, Pane, majorScale, minorScale } from 'evergreen-ui';

import { hoagiePlan } from '@/lib/hoagie-ui/Theme/themes';

interface AuthButtonProps {
	/** defines whether the button is for "login" or "logout" */
	variant?: string;
	/** optional custom url to direct; uses API endpoints by default */
	href?: string;
}

/** AuthButton is a button meant for logins and logout throughout
 * different Hoagie applications.
 */
export const AuthButton: FC<AuthButtonProps> = ({ variant = 'login', href = '' }) => {
	const theme = hoagiePlan;
	const logo = (
		<h2
			style={{
				fontSize: '28px',
				paddingRight: 16,
			}}
			className='hoagie'
		>
			h
		</h2>
	);
	const isLogout = variant === 'logout';
	const defHref = isLogout ? '/auth/logout' : '/auth/login?connection=Princeton-CAS';
	return (
		<a href={href === '' ? defHref : href}>
			<Button
				height={56}
				width={majorScale(35)}
				background={theme.colors.white}
				appearance={isLogout ? 'default' : 'primary'}
			>
				{logo}
				<Pane display='flex'>
					{isLogout ? 'Logout from' : 'Login using'}
					<Pane marginLeft={minorScale(1)} className='hoagie'>
						hoagie<b>profile</b>
					</Pane>
				</Pane>
			</Button>
		</a>
	);
};
