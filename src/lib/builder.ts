import {
  GetResponse,
  GetVariables,
  GQLBuilder,
  JSONQuery,
  QueryType,
  SchemaType,
} from "../types";
import { Parser } from "./parser";

export class QueryBuilder<Q = any, M = any, S = any> {
  private readonly parser: Parser;

  constructor(private readonly schema: SchemaType) {
    this.parser = new Parser(this.schema);
  }

  getSchema(): SchemaType {
    return this.schema;
  }

  query<T extends GQLBuilder<Q> | string>(
    query: T
  ): BuiltQuery<T, GetResponse<Q, T>, GetVariables<T>> {
    return new BuiltQuery("query", query);
  }

  mutation<T extends GQLBuilder<M> | string>(
    mutation: T
  ): BuiltQuery<T, GetResponse<M, T>, GetVariables<T>> {
    return new BuiltQuery("mutation", mutation);
  }

  subscription<T extends GQLBuilder<S> | string>(
    subscription: T
  ): BuiltQuery<T, GetResponse<S, T>, GetVariables<T>> {
    return new BuiltQuery("subscription", subscription);
  }

  parse<Q extends BuiltQuery<any>>(query: Q, vars: Q["variables"]) {
    return this.parser.parseToJSON(query, vars);
  }

  parseToQueryString(query: any) {
    return this.parser.parseToQueryString(query);
  }

  parseToJSON(query: any, vars?: JSONQuery["variables"]) {
    return this.parser.parseToJSON(query, vars);
  }

  parseToJsonString(query: any, vars?: JSONQuery["variables"]) {
    return this.parser.parseToJsonString(query, vars);
  }
}

export class BuiltQuery<Q, R = any, V = any> {
  readonly response: R = null!;
  readonly variables: V = null!;

  constructor(private readonly type: QueryType, private readonly query: Q) {}

  getType(): QueryType {
    return this.type;
  }

  getQuery(): Q {
    return this.query;
  }
}
