import { Schema } from "../example/generated/output";
import { Args, args } from "../lib/args";
import { Fragment } from "../lib/fragment";
import { Variable } from "../lib/var";
import { Spread } from "./merge";
import { GetResponse } from "./response";
import { GetVariables } from "./vars";

/** Checks if type is 'any' */
type isAny<T> = unknown extends T ? true : false;

/** Builds object with keys whose values are nullable */
type PickNullable<T> = {
  [P in keyof T as null extends T[P] ? P : never]: T[P];
};

/** Builds object with keys whose values are not nullable */
export type PickNotNullable<T> = {
  [P in keyof T as null extends T[P] ? never : P]: T[P];
};

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
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/** Type for a field's arguments */
export type Arguments = Record<string, any>;

/** Converts nullable arguments to optional */
type HandleArguments<Args extends Arguments> = {
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

/** Represents field with arguments */
export type FieldWithArguments = readonly [Arguments, any];

/** Allows type to be inside of fragment */
type Fragmentable<T> = T | Fragment<any, T>;

type Arrayble<T> = T | Array<T extends boolean ? T : Exclude<T, boolean>>;
type RequiredArray<T> = T extends Array<infer T> ? [T, ...T[]] : [T, ...T[]];

/**
 * Builds the query type
 * @param S Schema - { key: value } | union<S> | [ args, S ]
 */
export type GQLBuilder<S2, S = NonNullable<S2>> = isAny<S> extends true
  ? Arrayble<boolean | object>
  : [S] extends [object] // avoid union distributive condiotional types
  ? [S] extends [Array<infer E>]
    ? S extends FieldWithArguments
      ?
          | [Args<HandleArguments<S[0]>>, ...RequiredArray<GQLBuilder<S[1]>>]
          | (keyof PickNotNullable<S[0]> extends never
              ? GQLBuilder<S[1]> | boolean
              : never)
      : GQLBuilder<E>
    : Arrayble<
        Fragmentable<
          | Partial<
              XOR<{
                [K in keyof S]: GQLBuilder<S[K]>;
              }>
            >
          | boolean
        >
      >
  : Arrayble<boolean>;

// const query = {
//   Activity: [
//     { message: true, messenger: { createdAt: true } },
//     { id: true, message: false, messenger: [{createdAt: true}, {createdAt: false}] },
//   ],
// } satisfies GQLBuilder<Schema["Query"]>;

function q<const Q extends GQLBuilder<Schema["Query"]>>(query: Q) {
  return query;
}

const query = q({
  Activity: [
    args({
      createdAt: new Variable(),
    }),
    { message: true, messenger: [{ createdAt: true }] },
    {
      id: true,
      message: false,

      messenger: {
        about: false,
        favourites: [
          args({ page: new Variable("page2") }),
          { anime: true },
          { anime: false },
          new Fragment("", "", { anime: true }),
        ],
      },
    },
  ],
});

type a = Spread<(typeof query)["Activity"]> & {};
// type B = typeof query['Activity'] extends [infer A, ...infer C] ? C : never

type v = GetVariables<typeof query>;

const vars: v = {
  createdAt: 1,
  page2: null,
};

type Impossible<K extends keyof any> = {
  [P in K]: never;
};

// The secret sauce! Provide it the type that contains only the properties you want,
// and then a type that extends that type, based on what the caller provided
// using generics.
export type NoExtraProperties<T, U extends T = T> = U &
  Impossible<Exclude<keyof U, keyof T>>;

type Z = boolean extends object | boolean ? true : false;
