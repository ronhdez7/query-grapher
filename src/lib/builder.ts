import { GQLBuilder, QueryType, SchemaType, StrictQuery } from "../types";

// json string
// json
// query string
// document node

export class QueryBuilder<Q, M> {
  constructor(private readonly schema: SchemaType) {}

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
