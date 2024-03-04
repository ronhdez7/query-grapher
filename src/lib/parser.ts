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

  private parseBody(query: any, root: SchemaType[string] | DataValue): string {
    if (!query) return "";
    else if (typeof query === "string") return query;

    // Reference
    if (typeof root === "string") {
      const rootValue = this.schema[getName(root)];
      if (!rootValue) return "";
      return this.parseBody(query, rootValue);
    }

    // Union | List | FieldWithArgs
    else if (root instanceof Array) {
      if (root.length === 1) this.parseBody(query, root[0]);
      else if (root[0] && typeof root[0] !== "string") {
        if (query === true) {
          const args = root[0] as Arguments;
          for (const argKey in args) {
            const argValue = args[argKey] as string;
            if (
              argValue &&
              typeof argValue === "string" &&
              argValue.endsWith("!")
            )
              return "null";
          }
          return this.parseBody(true, root[1] ?? "");
        }

        const { args, data } = query;
        if (!data) return "";

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

        output += this.parseBody(query["data"], root[1] ?? "");
        return output;
      }
      return "";
    }

    // Object with fields
    else {
      if (query instanceof Fragment) {
        return this.parseBody(query.getFragment(), root);
      } else if (query === true) {
        let output = "{\n";

        for (const key in root) {
          const value = root[key];
          if (!value) continue;
          // else if (typeof value === "string") {
          // 	output += key + " " + this.parseBody(true, value) + "\n"
          // } else if (value instanceof Array) {
          // 	output += key + " " + this.parseBody(true, value) + "\n"
          // }
          output += key + " " + this.parseBody(true, value) + "\n";
        }

        return output + "}";
      } else {
        let output = "{\n";
        for (const key in query) {
          const newRoot = root[key];
          if (!query[key] || !newRoot) continue;

          output += key + " " + this.parseBody(query[key], newRoot) + "\n";
        }

        return output + "}";
      }
    }

    return "";
  }
}

function getName(name: string) {
  if (name.endsWith("!")) return name.slice(0, -1);
  return name;
}
