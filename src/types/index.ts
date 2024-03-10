import { BuiltQuery } from "../lib/builder";
import { Fragment } from "../lib/fragment";
import { Variable } from "../lib/var";

/*
 * Handle Unions
 */

type AllKeys<T> = T extends unknown ? keyof T : never;
type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type _ExclusifyUnion<T, K extends PropertyKey> = T extends unknown
  ? Id<T & Partial<Record<Exclude<K, AllKeys<T>>, never>>>
  : never;
type ExclusifyUnion<T> = _ExclusifyUnion<T, AllKeys<T>>;

/** Checks if type is an union */
type IsUnion<T, U extends T = T> = T extends unknown
  ? [U] extends [T]
    ? false
    : true
  : false;

/** Creates exclusive types from union (doesn't allow fields from types in union to be mixed) */
type XOR<T> = IsUnion<Extract<T, object>> extends true
  ? Exclude<T, object> | ExclusifyUnion<Extract<T, object>>
  : T;

/** Merges types of union to object */
type UnionToIntersection<U> = (
  U extends any
    ? (k: {
        [K in keyof U]: NonNullable<U[K]> extends never ? {} : U[K];
      }) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

/*
 * Helpers
 */

/** Checks if type is 'any' */
type isAny<T> = unknown extends T ? true : false;

/** Builds object with keys whose values are nullable */
type PickNullable<T> = {
  [P in keyof T as null extends T[P] ? P : never]: T[P];
};

/** Builds object with keys whose values are not nullable */
type PickNotNullable<T> = {
  [P in keyof T as null extends T[P] ? never : P]: T[P];
};

/** Doesn't allow extra fields in queries */
export type StrictQuery<T, Q> = {
  [K in keyof T]: K extends keyof Exclude<Q, boolean | Fragment<any, any>>
    ? T[K]
    : never;
} & Q;

/** Creates object with keys that extend U value */
type HasValue<T, U> = { [K in keyof T as T[K] extends U ? K : never]: T[K] };

export type NonEmptyString<T extends string> = T extends `${infer R}`
  ? R extends ""
    ? never
    : R
  : never;

// objects
export type SchemaType = {
  [key: string]: string | readonly string[] | { [k: string]: FieldNameValue };
};

/** Type of data for an object's fields */
export type FieldNameValue =
  | string
  | readonly [string]
  // | readonly [string, string, ...string[]]
  | readonly [Arguments, DataValue];

/** Type of data for a field with arguments */
export type DataValue = FieldNameValue | readonly DataValue[];

/*
 * Building the queries
 */

/** Type for a field's arguments */
export type Arguments = Record<string, any>;

/** Represents field with arguments */
type FieldWithArguments = [Arguments, any];

/** Makes arguments property optional if all arguments are optional */
type ArgumentsOrNot<Args extends Arguments> =
  keyof PickNotNullable<Args> extends never
    ? {
        args?: HandleArguments<Args>;
      }
    : { args: HandleArguments<Args> };

/** Converts nullable arguments to optional */
type HandleArguments<Args extends Arguments> = Args extends Array<any>
  ? Args
  : {
      [K in keyof PickNullable<Args>]?:
        | (Exclude<Args[K], null> extends object
            ? HandleArguments<Exclude<Args[K], null>>
            : Exclude<Args[K], null>)
        | Variable<Args[K]>;
    } & {
      [K in keyof PickNotNullable<Args>]:
        | (Args[K] extends object ? HandleArguments<Args[K]> : Args[K])
        | Variable<Args[K]>;
    };

/** Allows type to be inside of fragment */
type Fragmentable<T> = T | Fragment<any, T>;

/**
 * Constructs query object
 * @param S Schema (or field from it) to be used to build the query
 */
export type GQLBuilder<S> = isAny<S> extends true
  ? boolean
  : XOR<
      S extends object
        ? S extends Array<any>
          ? S extends FieldWithArguments
            ?
                | (ArgumentsOrNot<S[0]> & {
                    data: GQLBuilder<S[1]>;
                  })
                | (keyof PickNotNullable<S[0]> extends never ? boolean : never)
            : GQLBuilder<S[number]>
          : Fragmentable<
              Partial<
                XOR<{
                  [K in keyof S]: GQLBuilder<S[K]> | boolean;
                }>
              >
            >
        : boolean
    >;

/*
 * Extract Type from query
 */

/**  */
type GetQuery<Q> = Q extends BuiltQuery<infer BQ> ? BQ : Q;

/** Value to be skipped */
type FalsyValue = false | undefined;

/** Checks whether field should be skipped */
type isFalsy<S, T> = T extends true
  ? false
  : T extends FalsyValue
  ? true
  : T extends Fragment<any, infer Q>
  ? isFalsy<S, Q>
  : NonNullable<S> extends FieldWithArguments
  ? isFalsy<NonNullable<S>[1], "data" extends keyof T ? T["data"] : never>
  : keyof HasValue<
      {
        [K in keyof T]: K extends keyof NonNullable<S>
          ? isFalsy<NonNullable<S>[K], T[K]>
          : false;
      },
      false
    > extends never
  ? true
  : false;

/** Eliminates arguments from fields recursively */
type FlatField<F> = F extends object
  ? F extends Array<any>
    ? F extends FieldWithArguments
      ? keyof PickNotNullable<F[0]> extends never
        ? FlatField<F[1]>
        : never
      : Array<FlatField<F[number]>>
    : {
        [K in keyof F]: FlatField<F[K]>;
      }
  : F;

/**
 * Extracts response type
 * @param S Schema that contains all types
 * @param Q Query to extract type from
 */
export type ExtractResponse<S, Q2, Q = GetQuery<Q2>> = XOR<
  isFalsy<S, Q> extends true
    ? undefined
    : Q extends true
    ? FlatField<S>
    : Q extends Fragment<any, infer F>
    ? ExtractResponse<S, F>
    : S extends object
    ? S extends Array<any>
      ? S extends FieldWithArguments
        ? "data" extends keyof Q
          ? ExtractResponse<S[1], Q["data"]>
          : any
        : Array<ExtractResponse<S[number], Q>>
      : {
          [K in keyof Q as isFalsy<S, Q[K]> extends true
            ? never
            : K]: K extends keyof S ? ExtractResponse<S[K], Q[K]> : never;
        }
    : S
>;

/*
 * Extract Variable Types
 */

/**
 * Extract variables from query
 * @param Q Query to extract variables from
 */
export type ExtractVariables<
  S,
  Q2,
  Q = GetQuery<Q2>,
  K = keyof Q
> = UnionToIntersection<
  Q extends Fragment<any, infer F>
    ? ExtractVariables<NonNullable<S>, F>
    : K extends keyof Q
    ? Q[K] extends Variable<infer V, infer N>
      ? { [K2 in K as undefined extends N ? K : NonNullable<N>]: V }
      : NonNullable<S> extends FieldWithArguments
      ? isFalsy<NonNullable<S>, Q> extends false
        ? UnionToIntersection<
            ExtractVariables<NonNullable<S>[K extends "args" ? 0 : 1], Q[K]>
          >
        : never
      : K extends keyof NonNullable<S>
      ? ExtractVariables<NonNullable<S>[K], Q[K]>
      : never
    : never
>;

/*
 * Lib
 */

export type QueryType = "query" | "mutation" | "subscription";

export type JSONQuery<V extends Record<string, any> = Record<string, any>> = {
  operationName?: string;
  query: string;
  variables?: V;
};
