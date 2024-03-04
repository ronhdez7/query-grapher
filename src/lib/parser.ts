import { Arguments, DataValue, FieldNameValue, SchemaType } from "../types";
import { BuiltQuery } from "./builder";
import { Fragment } from "./fragment";
import { Variable } from "./var";

export class Parser {
  constructor(private readonly schema: SchemaType) {}

  private getQueryRoot(type: string) {
    if (type === "mutation") return this.schema["Mutation"];
    else if (type === "subscription") return this.schema["Subscription"];
    else return this.schema["Query"];
  }

  parseToQueryString(anyQuery: BuiltQuery<any>) {
    const query = anyQuery.getQuery();
    if (typeof query === "string") return query;

    const type = anyQuery.getType();

    const root = this.getQueryRoot(type);
    if (root === undefined) throw new Error("Query root was not found");

    const body = this.parseBody(query, root);

    return body;
  }

  private parseBody(
    query: any,
    root: SchemaType[string] | DataValue
  ): string | null {
    // make sure query is valid
    if (!query) return null;
    else if (typeof query === "string") return query;

    // Reference
    if (typeof root === "string") {
      const rootValue = this.schema[getName(root)];
      if (rootValue === undefined) return null;
      else if (rootValue === "") return "";
      else return this.parseBody(query, rootValue);
    }

    // Union | List | FieldWithArgs
    else if (root instanceof Array) {
      // List
      if (root.length === 1) {
        return this.parseBody(query, root[0]);
      }

      // FieldWithArgs
      else if (root[0] && typeof root[0] !== "string") {
        // parse all fields from root[1] (data) if all arguments are optional
        const rootData = root[1];
        if (rootData === undefined) return null;

        if (query === true) {
          const args = root[0] as Arguments;
          for (const argKey in args) {
            const argValue = args[argKey] as string;
            if (
              argValue &&
              typeof argValue === "string" &&
              argValue.endsWith("!")
            )
              return null;
          }
          return this.parseBody(true, rootData);
        }

        const { args, data } = query;
        if (!data) return null;

        let output = "";

        if (typeof args === "object") {
          let argsSection = "";
          for (const argKey in args) {
            const argValue = args[argKey];
            if (argValue === undefined || argValue === null) continue;

            argsSection += argKey + ": ";
            if (argValue instanceof Variable) {
              const varName = argValue.getName() ?? argKey;
              argsSection += `$${varName},`;
            } else {
              argsSection += String(argValue) + ",";
            }
          }
          if (argsSection !== "") output += `(${argsSection.slice(0, -1)}) `;
        }

        const body = this.parseBody(query["data"], rootData);
        if (body === null) return null;

        output += body;
        return output;
      }
      // Union
      else {
        return null;
      }
      return null;
    }

    // Object with fields
    else {
      // check if query is a fragment
      if (query instanceof Fragment) {
        return this.parseBody(query.getFragment(), root);
      }

      // check if all subfields should be parsed
      else if (query === true) {
        let output = "{\n";

        for (const key in root) {
          const value = root[key];
          if (!value) continue;

          const body = this.parseBody(true, value);
          if (body === null) continue;
          output += "" + key + " " + body + "\n";
        }

        return output + "}";
      }

      // check if query has invalid type
      else if (
        typeof query !== "object" ||
        query instanceof Array ||
        Object.keys(query).length === 0
      ) {
        return null;
      }

      // parse fields of query
      else {
        let output = "{\n";
        for (const key in query) {
          const newRoot = root[key];
          if (!query[key] || !newRoot) continue;

          const body = this.parseBody(query[key], newRoot);
          if (body === null) continue;
          output += "" + key + " " + body + "\n";
        }

        return output + "}";
      }
    }

    return null;
  }
}

function getName(name: string) {
  if (name.endsWith("!")) return name.slice(0, -1);
  return name;
}
