import { Fragment, fragment } from "../lib/fragment";
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

// objects
type SchemaType = {
  [key: string]:
    | string
    | { [k: string]: FieldNameValue | readonly [Arguments, FieldNameValue] };
};

/*
 * Building the queries
 */

/** Type for a field's arguments */
type Arguments = Record<string, any>;

/** Type of data for an object's fields */
type FieldNameValue =
  | string
  | readonly [string]
  | readonly [string, string, ...string[]];

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
        | Variable;
    } & {
      [K in keyof PickNotNullable<Args>]:
        | (Args[K] extends object ? HandleArguments<Args[K]> : Args[K])
        | Variable;
    };

/** Allows type to be inside of fragment */
type Fragmentable<T> = T | Fragment<T>;

/**
 * Constructs query object
 * @param S Schema (or field from it) to be used to build the query
 */
export type GQLBuilder<S> = isAny<S> extends true
  ? boolean
  :
      | Fragmentable<
          Partial<
            XOR<
              S extends object
                ? S extends Array<any>
                  ? S extends FieldWithArguments
                    ? ArgumentsOrNot<S[0]> & {
                        data: Fragmentable<GQLBuilder<S[1]>>;
                      }
                    : GQLBuilder<S[number]>
                  : {
                      [K in keyof S]: Fragmentable<GQLBuilder<S[K]>>;
                    }
                : boolean
            >
          >
        >
      | boolean;

/*
 * Extract Type from query
 */

/** Value to be skipped */
type FalsyValue = false | undefined;

/** Eliminates arguments from fields recursively */
type FlatField<F> = F extends object
  ? F extends Array<any>
    ? F extends FieldWithArguments
      ? FlatField<F[1]>
      : Array<FlatField<F[number]>>
    : {
        [K in keyof F as F[K] extends FieldWithArguments
          ? keyof PickNotNullable<F[K][0]> extends never
            ? K
            : never
          : K]: FlatField<F[K]>;
      }
  : F;

/**
 * Extracts response type
 * @param S Schema that contains all types
 * @param Q Query to extract type from
 */
export type ExtractResponse<S, Q> = XOR<
  Q extends FalsyValue
    ? undefined
    : Q extends true
    ? FlatField<S>
    : Q extends Fragment<infer F>
    ? ExtractResponse<S, F>
    : S extends object
    ? S extends Array<any>
      ? S extends FieldWithArguments
        ? "data" extends keyof Q
          ? ExtractResponse<S[1], Q["data"]>
          : any
        : Array<ExtractResponse<S[number], Q>>
      : {
          [K in keyof Q as K extends keyof S
            ? S[K] extends FieldWithArguments
              ? keyof PickNotNullable<S[K][0]> extends never
                ? K
                : never
              : K
            : never]: K extends keyof S ? ExtractResponse<S[K], Q[K]> : never;
        }
    : S
>;

/*
 * Extract Variable Types
 */

/** Gets first word before dot (.) */
type GetFirst<T extends string> = T extends `${infer A}.${infer _}` ? A : T;

/** Gets last word after dot (.) */
type GetLast<T extends string> = T extends `${infer _}.${infer B}`
  ? GetLast<B>
  : T;

/** Gets rest of the string after first dot (.) */
type GetRest<T extends string> = T extends `${infer _}.${infer B}` ? B : T;

/**
 * Gets nested value in a query
 * @param Q Query to be used
 * @param P Path of type string like 'A.B.C.D'
 */
type GetNestedValue<Q, P extends string> = GetFirst<P> extends keyof Q
  ? GetNestedValue<Q[GetFirst<P>], P extends `${infer _}.${infer B}` ? B : P>
  : Q;

/**
 * Gets nested value in a schema
 * @param S Schema to be used
 * @param P Path of type string like 'A.B.C.D'
 */
type GetNestedValueInModel<S, P extends string> = S extends Array<any>
  ? S extends FieldWithArguments
    ? GetFirst<P> extends "args"
      ? GetNestedValueInModel<S[0], GetRest<P>>
      : GetNestedValueInModel<S[1], GetRest<P>>
    : GetNestedValueInModel<S[number], P>
  : GetFirst<P> extends keyof S
  ? GetNestedValueInModel<S[GetFirst<P>], GetRest<P>>
  : S;

/**
 * Extract paths to all variables in query
 * @param Q Query to find variable in
 */
type ExtractVariablesPaths<Q> = Q extends Fragment<infer F>
  ? ExtractVariablesPaths<F>
  : Q extends Record<string, any>
  ? {
      [K in keyof Q as NonNullable<Q[K]> extends Variable
        ? K
        : NonNullable<Q[K]> extends Record<string, any>
        ? `${Exclude<K, symbol>}.${Exclude<
            keyof ExtractVariablesPaths<NonNullable<Q[K]>>,
            symbol
          >}`
        : never]: K;
    }
  : {};

/**
 * Extracts variables from a query
 * @param M Schema to get types from
 * @param Q Query to extract variables from
 * @param P Paths to all variables, should not be passed in
 */
export type ExtractVariables<
  M,
  Q,
  P = ExtractVariablesPaths<Q>
> = P extends Record<string, any>
  ? {
      [K in keyof P as K extends string
        ? GetNestedValue<Q, K> extends Variable<infer N>
          ? undefined extends N
            ? GetLast<K>
            : N
          : GetLast<K>
        : never]: K extends string
        ? Exclude<GetNestedValueInModel<M, K>, object>
        : any;
    }
  : {};
