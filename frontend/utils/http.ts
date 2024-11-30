/**
 * @overview Utility helpers related to HTTP requests.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at
 * 
 *    https://github.com/hoagieclub/meal/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import { HttpMethod, HTTP_METHODS } from '@/types/http';

// Checks if requested HTTP method is valid
export const valid = (method: string): method is HttpMethod => HTTP_METHODS.includes(method as HttpMethod);

// Syntactic sugar for adding auth headers
export const withAuth = (token: string) => ({
  Authorization: `Bearer ${token}`
});
