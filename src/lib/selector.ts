import { GQLBuilder } from "../types";

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
  Q extends T extends keyof S ? GQLBuilder<S[T]> : never
>(
  type: T,
  query: Q
) => Q {
  return (_, query) => query;
}
