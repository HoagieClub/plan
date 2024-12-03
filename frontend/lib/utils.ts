/**
 * @overview Utility functions for the Hoagie Plan app.
 *
 * This module provides utility functions that simplify class name manipulation and merging.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine and merge Tailwind CSS class names.
 *
 * This function uses `clsx` to conditionally join class names together and
 * `twMerge` to ensure Tailwind CSS class conflicts are properly handled
 * (e.g., merging duplicate utility classes).
 *
 * @param {...ClassValue[]} inputs - A variadic list of class values to be processed. These can be
 * strings, arrays, objects, or any class names conditionally applied.
 *
 * @returns {string} The final merged class name string that can be applied to a component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
