import { GQLBuilder, QueryType, SchemaType, StrictQuery } from "../types";
import { Parser } from "./parser";

// json string
// json
// query string
// document node

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
  ): BuiltQuery<T> {
    return new BuiltQuery("query", query);
  }

  mutation<T extends StrictQuery<T, GQLBuilder<M>> | string>(
    mutation: T
  ): BuiltQuery<T> {
    return new BuiltQuery("mutation", mutation);
  }

  subscription<T extends StrictQuery<T, GQLBuilder<S>> | string>(
    subscription: T
  ): BuiltQuery<T> {
    return new BuiltQuery("subscription", subscription);
  }

  parseToQueryString(query: any) {
    return this.parser.parseToQueryString(query);
  }

  parseToJSON(query: any) {
    return this.parser.parseToJSON(query);
  }

  parseToJsonString(query: any) {
    return this.parser.parseToJsonString(query);
  }
}

export class BuiltQuery<Q> {
  constructor(private readonly type: QueryType, private readonly query: Q) {}

  getType(): QueryType {
    return this.type;
  }

  getQuery(): Q {
    return this.query;
  }
}
