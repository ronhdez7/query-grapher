import { Schema } from "../example/generated/output";
import { GQLBuilder } from "../types";

export function fragment<T, Q = GQLBuilder<T>>(query: Q): Q {
  return query;
}

export class Fragment<T, Q = GQLBuilder<T>> {
  constructor(private readonly fragment: Q) {}

  getFragment(): Q {
    return this.fragment;
  }
}

const query: GQLBuilder<Schema["Query"]> = {};
