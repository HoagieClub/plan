/**
 * @overview Auth0 client configuration for HoagiePlan.
 *
 * By default, the following properties claims from the ID token are added to
 * the user object in the session automatically:
 * - sub
 * - name
 * - nickname
 * - given_name
 * - family_name
 * - picture
 * - email
 * - email_verified
 * - org_id
 *
 * If you'd like to customize the user object to include additional custom
 * claims from the ID token, you can use the beforeSessionSaved hook.
 *
 * It's best practice to limit what claims are stored on the user object
 * in the session to avoid bloating the session cookie size and
 * going over browser limits.
 *
 * Read more from the docs:
 *
 *    https://github.com/auth0/nextjs-auth0/tree/v4
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

import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
	authorizationParameters: {
		scope: process.env.AUTH0_SCOPE,
		audience: process.env.AUTH0_AUDIENCE,
	},
});
