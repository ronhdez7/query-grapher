import { GQLBuilder, NonEmptyString } from "../types";

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
  N extends string,
  T extends keyof S,
  Q extends T extends keyof S ? GQLBuilder<S[T]> : never
>(
  name: N & NonEmptyString<N>,
  type: T,
  query: Q
) => Fragment<T, Q> {
  return (name, type, query) => new Fragment(name, type, query);
}

export function fieldFragment<N extends string, Q>(
  name: N & NonEmptyString<N>,
  query: Q
): Fragment<any, Q> {
  return new Fragment(name, undefined, query);
}
