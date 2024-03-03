import { Schema } from "../example/generated/output";
import { GQLBuilder } from "../types";

export class Fragment<T> {
  constructor(private readonly fragment: T) {}

  getFragment() {
    return this.fragment;
  }
}

export function fragment<T>(): <Q extends GQLBuilder<T>>(
  query: Q
) => Fragment<Q> {
  return function <Q extends GQLBuilder<T>>(query: Q): Fragment<Q> {
    return new Fragment(query);
  };
}

fragment<Schema["Query"]>()({
  A: true,
  a: 1,
});
