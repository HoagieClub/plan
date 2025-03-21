/**
 * @overview Recursively converts snake_case to camelCase.
 *
 * Input:
 *    type Input = {
 *      some_key: string;
 *      nested_obj: {
 *        another_key: number;
 *      };
 *      list_of_items: { item_name: boolean }[];
 *    };
 *
 * Output:
 *    type Output = {
 *      someKey: string;
 *      nestedObj: {
 *        anotherKey: number;
 *      };
 *      listOfItems: { itemName: boolean }[];
 *    };
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

type CamelCase<S extends string> = S extends `${infer H}_${infer T}`
	? `${H}${Capitalize<CamelCase<T>>}`
	: S;

type ToCamelCase<T> = T extends readonly (infer U)[]
	? ToCamelCase<U>[]
	: T extends object
		? { [K in keyof T as K extends string ? CamelCase<K> : K]: ToCamelCase<T[K]> }
		: T;

// Find underscores followed by lowercase letter w/ Regex, convert to uppercase, e.g. some_key->someKey
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

export default function toCamelCase<T>(obj: T): ToCamelCase<T> {
	return Array.isArray(obj)
		? (obj.map(toCamelCase) as ToCamelCase<T>) // If array, map toCamelCase over each element recursively
		: obj && typeof obj === 'object' // If non-null object,
			? (Object.entries(obj as Record<string, unknown>)
					// build a new object with reduce,
					.reduce(
						(acc, [k, v]) => {
							// accumulate camelCased keys, and recursively pass its values to toCamelCase
							acc[toCamel(k)] = toCamelCase(v);
							return acc;
						},
						{} as Record<string, unknown>
					) as ToCamelCase<T>)
			: // If not array or object, we return the primitive as-is
				(obj as ToCamelCase<T>);
}
