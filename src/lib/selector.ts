import { Fragment } from "./fragment";

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
export function select<T>(): <
  Q extends {
    [K in keyof Q]: K extends keyof Exclude<T, boolean | Fragment<any>>
      ? Q[K]
      : never;
  }
>(
  query: Q & T
) => Q {
  return (query) => query;
}
