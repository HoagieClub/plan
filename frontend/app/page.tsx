/**
 * @overview Landing page for the Hoagie Plan app.
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at
 *
 *    https://github.com/hoagieclub/plan/blob/main/LICENSE
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software. This software is provided "as-is", without warranty of any kind.
 */

'use client';

import { useUser } from '@auth0/nextjs-auth0';
import {
	Pane,
	majorScale,
	minorScale,
	Heading,
	Spinner,
	CalendarIcon,
	GridViewIcon,
	ArrowLeftIcon,
	Button,
} from 'evergreen-ui';
import Link from 'next/link';

import { AuthButton } from '@/lib/hoagie-ui/AuthButton';
import { hoagiePlan } from '@/lib/hoagie-ui/Theme/themes';

export default function Index() {
	const theme = hoagiePlan;
	const { user, error, isLoading } = useUser(); // todo: this gives annoying unauthorized console log

	let Profile;
	if (isLoading) {
		Profile = <Spinner />;
	} else if (error || !user) {
		Profile = <AuthButton />;
	} else {
		Profile = (
			<Pane>
				<Link href='/dashboard'>
					<Button
						height={56}
						width={majorScale(35)}
						backgroundColor={theme.colors.slate150}
						marginBottom={20}
						iconBefore={GridViewIcon}
					>
						Plan your four-year path
					</Button>
				</Link>
				<br />
				<Link href='/calendar'>
					<Button
						height={56}
						width={majorScale(35)}
						backgroundColor={theme.colors.slate150}
						marginBottom={20}
						iconBefore={CalendarIcon}
					>
						Plan your weekly classes
					</Button>
				</Link>
				<br />
				<AuthButton variant='logout' />
			</Pane>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				marginLeft: '8px',
				marginRight: '8px',
				paddingBottom: '32px',
				paddingTop: '64px',
			}}
		>
			<div
				style={{
					borderRadius: '8px',
					textAlign: 'center',
					boxShadow: '0 0 1px rgba(67, 90, 111, 0.3), 0 2px 4px -2px rgba(67, 90, 111, 0.47)',
					background: 'white',
					marginLeft: '20px',
					marginRight: '20px',
					maxWidth: '600px',
					width: '100%',
					paddingLeft: '10px',
					paddingRight: '10px',
					paddingTop: '40px',
					paddingBottom: '56px',
					boxSizing: 'border-box',
				}}
			>
				<Heading size={900} className='hoagie'>
					Welcome to HoagiePlan
				</Heading>
				<br />
				<p>
					Explore courses, read reviews, and manage <br />
					your four-year schedule.
				</p>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						marginTop: '30px',
					}}
				>
					{Profile}
					<Link href='https://hoagie.io'>
						<Button
							height={56}
							width={majorScale(35)}
							appearance='default'
							marginTop={20}
							iconBefore={ArrowLeftIcon}
						>
							<Pane display='flex'>
								Back to
								<Pane marginLeft={minorScale(1)} className='hoagie'>
									hoagie<b>platform</b>
								</Pane>
							</Pane>
						</Button>
					</Link>
					<br />
				</div>
			</div>
		</div>
	);
}
