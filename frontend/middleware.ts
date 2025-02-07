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

import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

// Protected routes requiring authentication
const protectedRoutes = ['/dashboard', '/calendar'];

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'http://localhost:8000', // Local Django development
  process.env.HOAGIE, // Frontend URL
  process.env.BACKEND, // Backend URL
].filter(Boolean); // Remove any undefined values

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS for API routes
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const res = NextResponse.next();

    // Set CORS headers for allowed origins
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
    }

    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: res.headers });
    }

    return res;
  }

  // Handle protected routes authentication
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = req.cookies.get('appSession');

    if (!token) {
      const loginUrl = new URL('/api/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Update matcher to include both API and protected routes
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/calendar/:path*'],
};
