/**
 * @overview Next.js middleware file for the Hoagie Plan app.
 * Middleware allows you to intercept requests before they reach the server.
 *
 *    https://nextjs.org/docs/app/building-your-application/routing/middleware
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at
 *
 *    https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { auth0 } from '@/lib/auth0';

export async function middleware(request: NextRequest) {
	const authRes = await auth0.middleware(request);

	// authentication routes — let the middleware handle it
	if (request.nextUrl.pathname.startsWith('/auth')) {
		return authRes;
	}

	const { origin } = new URL(request.url);
	const session = await auth0.getSession(request);

	// protect dashboard and calendar routes
	if (
		(request.nextUrl.pathname.startsWith('/dashboard') ||
			request.nextUrl.pathname.startsWith('/calendar')) &&
		!session
	) {
		return NextResponse.redirect(`${origin}/auth/login`);
	}

	return authRes;
}

export const config = {
	/*
	 * Match all request paths except for the ones starting with:
	 * - _next/static (static files)
	 * - _next/image (image optimization files)
	 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
	 */
	matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
