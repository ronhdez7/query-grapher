import {
  ExtractResponse,
  ExtractVariables,
  GQLBuilder,
  JSONQuery,
  QueryType,
  SchemaType,
  StrictQuery,
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

  query<T extends StrictQuery<T, GQLBuilder<Q>> | string>(
    query: T
  ): BuiltQuery<T, ExtractResponse<Q, T>, ExtractVariables<Q, T>> {
    return new BuiltQuery("query", query);
  }

  mutation<T extends StrictQuery<T, GQLBuilder<M>> | string>(
    mutation: T
  ): BuiltQuery<T, ExtractResponse<M, T>, ExtractVariables<M, T>> {
    return new BuiltQuery("mutation", mutation);
  }

  subscription<T extends StrictQuery<T, GQLBuilder<S>> | string>(
    subscription: T
  ): BuiltQuery<T, ExtractResponse<S, T>, ExtractVariables<S, T>> {
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
