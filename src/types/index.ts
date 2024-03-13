import { Arguments } from "./builder";

export * from "./builder";
export * from "./response";
export * from "./vars";

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

export type QueryType = "query" | "mutation" | "subscription";

export type JSONQuery<V extends Record<string, any> = Record<string, any>> = {
  operationName?: string;
  query: string;
  variables?: V;
};
