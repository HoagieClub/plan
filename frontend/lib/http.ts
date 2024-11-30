/**
 * @overview Generic fetch wrapper that handles JSON parsing and HTTP error responses.
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

import { ApiResponse, HoagieRequest, RequestConfig, HttpMethod } from '@/types/http';
import { valid } from '@/utils/http';

/**
* Makes HTTP requests to the Hoagie API.
* 
* @param config - Optional request configuration (method, headers)
* @returns Async function taking endpoint and optional args
* 
* @example (recommended)
* useSWR('/endpoint', request.get())
* useSWRMutation('/endpoint', request.post())
* 
* @example (custom headers)
* request.get({ Authorization: 'Bearer token' })
* 
* @example (minimal syntactic sugar)
* request({ method: 'GET', headers: {...} })
* 
* @throws On invalid HTTP method or failed request
*/
export const request: HoagieRequest = (<T>(config: RequestConfig<HttpMethod> = {}) => {
  return async (
    endpoint: string,
    { arg }: { arg?: Record<string, any> } = {}
  ): Promise<ApiResponse<T>> => {
    if (config.method && !valid(config.method)) {
      throw new Error(`Invalid HTTP method: ${config.method}`);
    }

    const url = `${process.env.HOAGIE_API_URL}${endpoint}`;
    const options: RequestInit = {
      method: config.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      mode: 'no-cors', // TODO: Eventually fix CORS issues
    };

    // Add the request body if the method is not GET and arguments are provided
    if (config.method && config.method.toUpperCase() !== 'GET' && arg) {
      options.body = JSON.stringify(arg);
    }

    try {
      // making the API request
      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        throw {
          status: res.status,
          message: data.error || 'An error occurred',
          data,
        };
      }

      return data;
    } catch (error: any) {
      throw {
        status: error.status || 500,
        message: error.message || 'An error occurred',
        data: error.data,
      };
    }
  };
}) as HoagieRequest;