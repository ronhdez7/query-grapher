import { GQLBuilder, StrictQuery } from "../types";

/**
 * Creates a fragment
 *
 * Fragment will only be typed if it is used inside a query.
 * It allows extra fields to be passed, which can't be prevented, but they are removed when parsed.
 *
 * To use outside of query, use the function 'fragment'.
 */
export class Fragment<T, Q> {
  constructor(
    private readonly name: string,
    private readonly type: T,
    private readonly fragment: Q
  ) {}

  getName() {
    return this.name;
  }

  getType() {
    return this.type;
  }

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
 *    fragment<Schema>()("Query", { ...fragment });
 * ```
 *
 * @generic T = Schema-like object to type fragment. Always required
 * @returns Function that takes a typed fragment
 */
export function fragment<S>(): <
  T extends keyof S,
  Q extends StrictQuery<Q, GQLBuilder<S[T]>>
>(
  name: string,
  type: T,
  query: Q
) => Fragment<T, Q> {
  return (name, type, query) => new Fragment(name, type, query);
}
