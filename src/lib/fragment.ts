/**
 * Creates a fragment
 *
 * Fragment will only be typed if it is used inside a query.
 * It allows extra fields to be passed, which can't be prevented, but they are removed when parsed.
 *
 * To use outside of query, use the function 'fragment'.
 */
export class Fragment<T> {
  constructor(private readonly fragment: T) {}

  getFragment() {
    return this.fragment;
  }
}

/**
 * Creates a fragment
 *
 * Works similiarly to 'select':
 *
 * ```
 * const fragment: Fragment<typeof fragment> =
 *    fragment<GQLBuilder<Schema["Query"]["Field"]>>()({ ...fragment });
 * ```
 *
 * @generic T = Schema-like object to type fragment. Always required
 * @returns Function that takes a typed fragment
 */
export function fragment<T>(): <
  Q extends {
    [K in keyof Q]: K extends keyof Exclude<T, boolean | Fragment<any>>
      ? Q[K]
      : never;
  }
>(
  query: Q & T
) => Fragment<Q> {
  return (query) => new Fragment(query);
}
