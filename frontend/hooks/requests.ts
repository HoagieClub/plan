/**
 * @overview Hook for fetching various Hoagie Meal API endpoints.
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

import useSWR from 'swr';
import { request } from '@/lib/http';
import type { FetchConfig, ApiResponse } from '@/types/http';
import type { DiningLocation, DiningEvent, MenuItem } from '@/types/dining';

/**
 * Fetcher function to be used with SWR.
 * It calls the request.get method with the provided URL and an empty args object.
 *
 * @param url The API endpoint to fetch data from.
 * @returns A promise that resolves to the API response.
 */
const get = request.get = <T>(headers?: HeadersInit) => request<T>({ method: 'GET', headers });

/**
* Makes a POST request using the request.post method.
*
* @param headers Optional headers to include in the request.
* @returns A promise that resolves to the API response.
*/
request.post = <T>(headers?: HeadersInit) => request<T>({ method: 'POST', headers });

/**
* Makes a PUT request using the request.put method.
*
* @param headers Optional headers to include in the request.
* @returns A promise that resolves to the API response.
*/
request.put = <T>(headers?: HeadersInit) => request<T>({ method: 'PUT', headers });

/**
* Makes a PATCH request using the request.patch method.
*
* @param headers Optional headers to include in the request.
* @returns A promise that resolves to the API response.
*/
request.patch = <T>(headers?: HeadersInit) => request<T>({ method: 'PATCH', headers });

/**
* Makes a DELETE request using the request.delete method.
*
* @param headers Optional headers to include in the request.
* @returns A promise that resolves to the API response.
*/
request.delete = <T>(headers?: HeadersInit) => request<T>({ method: 'DELETE', headers });

/**
 * Hook to fetch dining locations.
 *
 * @param config Optional SWR fetch configuration.
 * @returns SWR response containing ApiResponse with an array of DiningLocation.
 */
export const useGetLocations = (config?: FetchConfig) => {
  return useSWR<ApiResponse<DiningLocation[]>>(
    '/api/dining/locations',
    get<DiningLocation[]>(),
    config
  );
};

/**
 * Hook to fetch dining events for a specific place.
 *
 * @param placeId ID of the place. Defaults to '1007'.
 * @param config Optional SWR fetch configuration.
 * @returns SWR response containing ApiResponse with an array of DiningEvent.
 */
export const useGetEvents = (
  placeId: string = '1007', 
  config?: FetchConfig
) => {
  const endpoint = `/api/dining/events?placeId=${encodeURIComponent(placeId)}`;
  return useSWR<ApiResponse<DiningEvent[]>>(
    endpoint,
    get<DiningEvent[]>(),
    config
  );
};

/**
 * Hook to fetch the menu for a specific location and menu ID.
 *
 * @param locationId ID of the dining location.
 * @param menuId ID of the menu.
 * @param config Optional SWR fetch configuration.
 * @returns SWR response containing ApiResponse with an array of MenuItem.
 */
export const useGetMenu = (
  locationId: string,
  menuId: string,
  config?: FetchConfig
) => {
  const endpoint = `/api/dining/menu?locationId=${encodeURIComponent(locationId)}&menuId=${encodeURIComponent(menuId)}`;
  return useSWR<ApiResponse<MenuItem[]>>(
    endpoint,
    get<MenuItem[]>(),
    config
  );
};