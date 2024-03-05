import { GQLBuilder, StrictQuery } from "../types";

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
export function select<S>(): <
  T extends keyof S,
  Q extends StrictQuery<Q, GQLBuilder<S[T]>>
>(
  type: T,
  query: Q
) => Q {
  return (_, query) => query;
}
