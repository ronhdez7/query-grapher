import { Args } from "../lib/args";
import { Fragment } from "../lib/fragment";
import { InlineFragment } from "../lib/inline-fragment";
import { Variable } from "../lib/var";

type ExtractVariables<T> = T extends object
  ? T extends Fragment<any, infer F>
    ? ExtractVariables<F>
    : T extends InlineFragment<any, infer F>
    ? ExtractVariables<F>
    : T extends Array<any>
    ? T extends [Args<any>, ...infer R]
      ? ExtractVariables<R[number]> &
          (T[0] extends Args<infer A>
            ? {
                [K in keyof A as A[K] extends Variable<any, infer N>
                  ? undefined extends N
                    ? K
                    : N
                  : never]: A[K] extends Variable<infer V> ? V : never;
              }
            : {})
      : ExtractVariables<T[number]>
    : keyof T extends infer K
    ? K extends keyof T
      ? ExtractVariables<T[K]>
      : {}
    : {}
  : {};

type Id<T> = [T] extends [never]
  ? {}
  : T extends infer U
  ? { [K in keyof U]: U[K] }
  : {};

export type GetVariables<T> = Id<ExtractVariables<T>>;
