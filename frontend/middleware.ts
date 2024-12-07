/**
 * @overview Next.js middleware file for the Hoagie Plan app.
 * Middleware allows you to intercept requests before they reach the server.
 *
 *    https://nextjs.org/docs/app/building-your-application/routing/middleware
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at
 *
 *    https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import { auth0 } from '@/lib/auth0';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
	return await auth0.middleware(request);
}

export const config = {
	/*
	 * Match all request paths except:
	 * - _next/static (Next.js internal static files)
	 * - _next/image (Next.js image optimization)
	 * - favicon.ico, sitemap.xml, robots.txt (common metadata files)
	 */
	matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
