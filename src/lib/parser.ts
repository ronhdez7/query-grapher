import { Arguments, DataValue, JSONQuery, SchemaType } from "../types";
import { Args } from "./args";
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

    let args;
    const arglist: string[] = [];
    if (Object.keys(this.variables).length > 0) {
      for (const varName in this.variables) {
        arglist.push(`${varName}: $${varName}`);
        this.variables[varName] = undefined;
      }
      args = `(${arglist.join(", ")})`;
    }

    let fragments = this.fragments.join("\n");
    this.fragments.splice(0, this.fragments.length);

    return `${fragments}\n\n${type}${args ? ` ${args} ` : " "}${body}`;
  }

  parseToJSON(anyQuery: BuiltQuery<any>, vars?: JSONQuery["variables"]) {
    const body = this.parseToQueryString(anyQuery);
    const result: JSONQuery = { query: body };
    if (vars) result["variables"] = vars;

    return result;
  }

  parseToJsonString(anyQuery: BuiltQuery<any>, vars?: JSONQuery["variables"]) {
    const body = this.parseToJSON(anyQuery, vars);

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

        let args: any;
        let data: any;
        if (Array.isArray(query)) {
          if (query[0] instanceof Args) {
            args = query[0]["args"];
            data = query.slice(1);
          } else {
            args = undefined;
            data = query.slice(0);
          }
        } else {
          args = undefined;
          data = query;
        }

        if (!data) return null;

        let output = "";

        let varsToSave: Record<string, any> = {};
        if (typeof args === "object") {
          const arglist: string[] = [];
          for (const argKey in args) {
            let argsSection = "";
            const argValue = args[argKey];
            if (argValue === undefined || argValue === null) continue;

            argsSection += argKey + ": ";
            if (argValue instanceof Variable) {
              const varName = argValue.getName() ?? argKey;
              argsSection += `$${varName}`;
              varsToSave[varName] = argValue;
            } else {
              argsSection += String(argValue);
            }
            arglist.push(argsSection);
          }
          if (arglist.length > 0) output += `(${arglist.join(", ")}) `;
        }

        const body = this.parseBody(data, rootData, visited);
        if (body === null) return null;

        for (const vk in varsToSave) this.variables[vk] = varsToSave[vk];

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
          if (body.trim().startsWith("...")) output += `{\n${body}\n}\n`;
          else output += key + " " + body + "\n";
        }

        if (output === "{\n") return null;

        return output + "}";
      }

      // merge elements in array
      else if (query instanceof Array) {
        let output = "{\n";

        const fragments = query.filter((e) => e instanceof Fragment);
        const toMerge = query.filter((e) => !(e instanceof Fragment));

        for (const fragment of fragments) {
          output += this.parseBody(fragment, root, visited) + "\n";
        }

        const result = mergeArray(toMerge);
        output += this.parseBody(result, root, visited)?.slice(2, -1) ?? "";
        output += "}"
        return output;
      }

      // check if query has invalid type
      else if (typeof query !== "object" || Object.keys(query).length === 0) {
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
          if (body.trim().startsWith("...")) output += `${key} {\n${body}\n}\n`;
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

function mergeArray(data: any) {
  if (!Array.isArray(data)) return data;
  if (data.length === 0) return {};

  const merged = data.reduce(merge, {});

  return merged;
}

function merge(prev: any, curr: any) {
  if (typeof curr !== "object") return curr;

  const output = Object.assign({}, prev);

  for (const key in curr) {
    const val = curr[key];

    // if (output[key] === undefined) {
    //   output[key] === val;
    //   continue;
    // }

    if (typeof val === "undefined") continue;
    else if (typeof val === "boolean") output[key] = val;
    else if (typeof val === "object") {
      if (Array.isArray(val)) {
        // const toMerge: any[] =
        //   val[0] instanceof Args ? val.slice(1) : val.slice(0);
        // const result = mergeArray(toMerge);
        output[key] = val;
      } else if (val instanceof Fragment) {
        const result = merge(output[key], val.getFragment());
        output[key] = result;
      } else {
        if (typeof output[key] === "object" && !Array.isArray(output[key])) {
          const result = merge(output[key], curr[key]);
          output[key] = result;
        } else output[key] = val;
      }
    } else continue;
  }

  return output;
}
