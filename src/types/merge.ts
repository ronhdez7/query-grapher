import { Args } from "../lib/args";
import { Fragment } from "../lib/fragment";

type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

type SpreadId<T> = [T] extends [object]
  ? [T] extends [Fragment<any, infer F>]
    ? SpreadId<F>
    : T extends infer U
    ? {
        [K in keyof U]: U[K] extends Array<any> ? Spread<U[K]> : SpreadId<U[K]>;
      }
    : never
  : T;

type SpreadTwo<L, R> = [L] extends [Fragment<any, infer LF>]
  ? SpreadTwo<LF, R>
  : [R] extends [Fragment<any, infer RF>]
  ? SpreadTwo<L, RF>
  : SpreadId<
      Pick<L, Exclude<keyof L, keyof R>> &
        Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
        Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
        SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
    >;

export type Spread<A extends readonly [...any]> = A extends readonly [
  infer L,
  ...infer R
]
  ? L extends Args<any>
    ? Spread<R>
    : SpreadTwo<L, Spread<R>>
  : {};
