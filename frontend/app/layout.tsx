/**
 * @overview Root layout component for the Hoagie Plan app. Styles apply to all children.
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import './globals.css';
import '@/lib/hoagie-ui/Theme/theme.css';

import { type ReactNode, type JSX } from 'react';

import { Auth0Provider } from '@auth0/nextjs-auth0';
import { type User } from '@auth0/nextjs-auth0/types';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Poppins } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { auth0 } from '@/lib/auth0';
import { Layout } from '@/lib/hoagie-ui/Layout';
import { Nav } from '@/lib/hoagie-ui/Nav';
import { Theme } from '@/lib/hoagie-ui/Theme';

const poppins = Poppins({
	weight: ['400', '500', '600', '700'],
	subsets: ['latin'],
});

import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Plan by Hoagie',
	description: 'Academic planning, reimagined.',
	manifest: 'manifest.json',
};

/**
 * Content Component
 * Fetches user data renders the main layout.
 *
 * @param children - The child components to render within the layout.
 * @returns JSX Element representing the content area.
 */
async function Content({ children }: { children: ReactNode }): Promise<JSX.Element> {
	// Server-side fetch
	const session = await auth0.getSession();
	const user: User | null = session?.user;

	const tabs = [
		{ title: 'About', href: '/about' },
		{ title: 'Graduation Requirements', href: '/dashboard' },
		{ title: 'Course Planner', href: '/calendar' },
		{ title: 'Contact', href: '/contact' },
	];
	
	return (
		<Auth0Provider user={user}>
			<Theme palette='plan'>
				<Layout>
					<Nav name='plan' tabs={tabs} user={user} />
					{children}
					<Toaster />
				</Layout>
			</Theme>
		</Auth0Provider>
	);
}

/**
 * RootLayout server side
 * Wraps the entire application with necessary providers and layouts.
 * Since Content maintains its own state, we need to pass it down as a client component prop.
 *
 * @param children - The child components to render within the layout.
 * @returns JSX Element representing the root HTML structure.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='en' className={`bg-white ${poppins.className}`}>
			{/* Background to match up-scroll */}
			<body className='antialiased'>
				{/* Uncomment this to see components re-render. Used for debugging. */}
				{/* <script src='https://unpkg.com/react-scan/dist/auto.global.js' /> */}

				<Content>{children}</Content>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
