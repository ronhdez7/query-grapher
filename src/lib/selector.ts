import { StrictQuery } from "../types";

/**
 * Creates a selector whose result can be reused without creating a fragment
 *
 * ```
 * const selector = select<GQLBuilder<Schema["Query"]>>();
 * const result: typeof query = selector({ ...query });
 * ```
 * @generic T = Schema-like object to type query
 * @returns Function that takes a typed query and returns the same
 */
export function select<T>(): <Q extends StrictQuery<Q, T>>(query: Q) => Q {
  return (query) => query;
}
