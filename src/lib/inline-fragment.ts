import { GQLBuilder } from "../types";

/**
 * Creates a inline fragment
 *
 * Inline Fragment will only be typed if it is used inside a query.
 * It allows extra fields to be passed, which can't be prevented, but they are removed when parsed.
 *
 * To use outside of query, use the function 'fragment'.
 */
export class InlineFragment<T, Q> {
  constructor(private readonly type: T, private readonly fragment: Q) {}

  getType() {
    return this.type;
  }

  getFragment() {
    return this.fragment;
  }
}

/**
 * Creates a inline fragment
 *
 * Works similiarly to 'select':
 *
 * ```
 * const fragment: Fragment<typeof fragment> =
 *    fragment<Schema>()("Query", { ...fragment });
 * ```
 *
 * @generic T = Schema-like object to type fragment. Always required
 * @returns Function that takes a typed fragment
 */
export function inlineFragment<S>(): <
  T extends keyof S,
  Q extends T extends keyof S ? GQLBuilder<S[T]> : never
>(
  type: T,
  query: Q
) => InlineFragment<T, Q> {
  return (type, query) => new InlineFragment(type, query);
}
