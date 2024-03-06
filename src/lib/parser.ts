import { Arguments, DataValue, SchemaType } from "../types";
import { BuiltQuery } from "./builder";
import { Fragment } from "./fragment";
import { Variable } from "./var";

export class Parser {
  private readonly variables: Record<string, any> = {};
  private readonly fragments: string[] = [];

  constructor(private readonly schema: SchemaType) {}

  private getQueryRoot(type: string) {
    if (type === "mutation") return this.schema["Mutation"];
    else if (type === "subscription") return this.schema["Subscription"];
    else return this.schema["Query"];
  }

  private getParseInfo(anyQuery: BuiltQuery<any>) {
    const query = anyQuery.getQuery();
    const type = anyQuery.getType();

    const root = this.getQueryRoot(type);
    if (root === undefined) throw new Error("Query root was not found");

    return { query, type, root };
  }

  parseToQueryString(anyQuery: BuiltQuery<any>) {
    const { query, root, type } = this.getParseInfo(anyQuery);
    if (typeof query === "string") return query;

    const body = this.parseBody(query, root) ?? "{}";

    let args = "";
    if (Object.keys(this.variables).length > 0) {
      args = "(";
      for (const varName in this.variables) {
        args += `${varName}: $${varName},`;
        this.variables[varName] = undefined;
      }
      args = args.slice(0, -1) + ")";
    }

    let fragments = this.fragments.join("\n");
    this.fragments.splice(0, this.fragments.length);

    return `${fragments}\n\n${type}${args ? ` ${args} ` : " "}${body}`;
  }

  parseToJSON(anyQuery: BuiltQuery<any>) {
    const body = this.parseToQueryString(anyQuery);

    return { query: body };
  }

  parseToJsonString(anyQuery: BuiltQuery<any>) {
    const body = this.parseToJSON(anyQuery);

    return JSON.stringify(body);
  }

  private parseBody(
    query: any,
    root: SchemaType[string] | DataValue,
    skip: string[] = []
  ): string | null {
    const visited = [...skip];

    // make sure query is valid
    if (!query) return null;
    else if (typeof query === "string") return query;

    // Reference
    if (typeof root === "string") {
      const name = getName(root);
      if (visited.includes(name)) return null;
      else visited.push(name);

      const rootValue = this.schema[name];
      if (rootValue === undefined) return null;
      else if (rootValue === "" || rootValue === "ENUM") return "";
      else return this.parseBody(query, rootValue, visited);
    }

    // Union | List | FieldWithArgs
    else if (root instanceof Array) {
      // List
      if (root.length === 1) {
        return this.parseBody(query, root[0], visited);
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
          return this.parseBody(true, rootData, visited);
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
              this.variables[varName] = argValue;
            } else {
              argsSection += String(argValue) + ",";
            }
          }
          if (argsSection !== "") output += `(${argsSection.slice(0, -1)}) `;
        }

        const body = this.parseBody(query["data"], rootData, visited);
        if (body === null) return null;

        output += body;
        return output;
      }
      // Union
      else {
        let i = 0;
        let body = null;
        while (i < root.length && body === null) {
          const member = root[i];
          if (member) body = this.parseBody(query, member, visited);
          i++;
        }
        return body;
      }
      return null;
    }

    // Object with fields
    else {
      // check if query is a fragment
      if (query instanceof Fragment) {
        const fragmentName = query.getName();
        const body = this.parseBody(query.getFragment(), root, visited);
        if (body === null) return null;
        const frag = `fragment ${fragmentName} on ${query.getType()} ${body}`;
        this.fragments.push(frag);
        // return this.parseBody(query.getFragment(), root, visited);
        return `...${fragmentName}`;
      }

      // check if all subfields should be parsed
      else if (query === true) {
        let output = "{\n";

        for (const key in root) {
          const value = root[key];
          if (!value) continue;

          const body = this.parseBody(true, value, visited);
          if (body === null) continue;
          if (body.startsWith("...")) output += `{\n${body}\n}\n`;
          else output += key + " " + body + "\n";
        }

        if (output === "{\n") return null;

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

          const body = this.parseBody(query[key], newRoot, visited);
          if (body === null) continue;
          if (body.startsWith("...")) output += `${key} {\n${body}\n}\n`;
          else output += key + " " + body + "\n";
        }

        if (output === "{\n") return null;

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
