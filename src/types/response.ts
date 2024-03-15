import { Fragment } from "../lib/fragment";
import { InlineFragment } from "../lib/inline-fragment";
import { FieldWithArguments, PickNotNullable } from "./builder";
import { Spread } from "./merge";

type FalsyValue = false | undefined;
type isFalsy<T> = T extends true
  ? false
  : T extends FalsyValue
  ? true
  : T extends object
  ? T extends Fragment<any, infer F>
    ? isFalsy<F>
    : T extends InlineFragment<any, infer F>
    ? isFalsy<F>
    : T extends readonly any[]
    ? isFalsy<Spread<T>>
    : keyof T extends never
    ? true
    : isFalsy<T[keyof T]>
  : true;

/** Eliminates arguments from fields recursively */
type FlatField<S> = S extends object
  ? S extends Array<any>
    ? S extends FieldWithArguments
      ? keyof PickNotNullable<S[0]> extends never
        ? FlatField<S[1]>
        : never
      : Array<FlatField<S[number]>>
    : {
        [K in keyof S]: FlatField<S[K]>;
      }
  : S;

export type GetResponse<S, T> = isFalsy<T> extends true
  ? undefined
  : S extends null
  ? null
  : T extends object
  ? T extends Fragment<any, infer F>
    ? GetResponse<S, F>
    : T extends InlineFragment<any, infer F>
    ? GetResponse<S, F>
    : S extends readonly (infer E)[]
    ? S extends FieldWithArguments
      ? GetResponse<S[1], T extends readonly any[] ? Spread<T> : T>
      : Array<GetResponse<E, T>>
    : T extends readonly any[]
    ? GetResponse<S, Spread<T>>
    : {
        [K in keyof T as isFalsy<T[K]> extends true
          ? never
          : K extends keyof S
          ? K
          : never]: K extends keyof S ? GetResponse<S[K], T[K]> : never;
      }
  : FlatField<S>;
