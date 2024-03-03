import { Fragment } from "./fragment";

/*
 * Leave here for reference
 */

// export function select<T>(): <
//   S extends Exclude<T, boolean | Fragment<any>>,
//   Q extends {
//     [K in keyof Q]: K extends keyof S ? S[K] : never;
//   }
// >(
//   query: Q & T
// ) => Q {
//   return (query) => query;
// }

// select<GQLBuilder<Schema["Query"]>>()({
//   Activity: {
//     args: {},
//     data: {
//       message: true,
//     },
//   },
// })

/*
 * Implementation
 */

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
  S extends Exclude<T, boolean | Fragment<any>>,
  Q extends {
    [K in keyof Q]: K extends keyof S ? Q[K] : never;
  }
>(
  query: Q & T
) => Q {
  return (query) => query;
}
