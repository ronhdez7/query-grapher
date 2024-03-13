import { Arguments } from "../types";

// type CheckElements<Q> = Q extends Array<infer E>

export class Field<A extends Arguments, const Q> {
  constructor(private readonly args: A, private readonly selection: Q) {}
}

export function field<A extends Arguments, Q>(args: A, sel: Q): Field<A, Q> {
  return new Field(args, sel);
}
