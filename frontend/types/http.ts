/**
 * @overview Type definitions related to HTTP requests.
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

// Strict literal types for Hoagie HTTP protocol
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

// Base config type w/ method-specific constraints
type MethodConfig<M extends HttpMethod> = {
  method?: M;
  headers?: HeadersInit;
}

// Base response type
export type ApiResponse<T> = {
  status?: number;
  data?: T;
  message?: string;
  error?: string;
}

// Prevent body in GET requests
export type RequestConfig<M extends HttpMethod> = M extends 'GET'
  ? MethodConfig<M>
  : MethodConfig<M> & { body?: BodyInit };

// Helper type method-specific functions
type RequestFunction<T> = (
  endpoint: string,
  { arg }: { arg?: Record<string, any> }
) => Promise<ApiResponse<T>>;

// Main request function type with method helpers
export interface HoagieRequest {
  <T>(config?: RequestConfig<HttpMethod>): RequestFunction<T>;
  get: <T>(headers?: HeadersInit) => RequestFunction<T>;
  post: <T>(headers?: HeadersInit) => RequestFunction<T>;
  put: <T>(headers?: HeadersInit) => RequestFunction<T>;
  patch: <T>(headers?: HeadersInit) => RequestFunction<T>;
  delete: <T>(headers?: HeadersInit) => RequestFunction<T>;
}

// SWR-specific options. Read the docs: https://swr.vercel.app/docs/getting-started
// Goes into the hooks as configuration options for SWR. See @/hooks/use-endpoints
export interface FetchConfig {
  revalidateOnFocus?: boolean;     // Revalidate on window focus
  revalidateOnReconnect?: boolean; // Revalidate on network reconnect
  refreshInterval?: number;        // Polling interval in ms (0 to disable)
  dedupingInterval?: number;       // Cache deduplication interval in ms
  refreshWhenHidden?: boolean;     // Refresh even if tab is hidden
  refreshWhenOffline?: boolean;    // Refresh even if offline
  revalidateOnMount?: boolean;     // Revalidate on component mount
  revalidateIfStale?: boolean;     // Revalidate if data is stale
  fallbackData?: any;              // Initial SSR data
  suspense?: boolean;              // Enable React Suspense
  keepPreviousData?: boolean;      // Retain old data while fetching
  onSuccess?: (data: any) => void; // Callback on fetch success
  onError?: (err: any) => void;    // Callback on fetch failure
}

// Next.js-specific options. Read the docs: https://nextjs.org/docs/app/building-your-application/data-fetching
// 
export interface NextFetchConfig {
  revalidate?: number | false;    // ISR revalidation time
  tags?: string[];                // Tags for on-demand revalidation
  cache?:
  // Cache control
  | 'force-cache'
  | 'no-store'
  | 'no-cache';
  next?: {                        // Next.js 13+ config
    revalidate?: number;          // ISR revalidation time
    tags?: string[];              // Tags for on-demand revalidation
  };
}
