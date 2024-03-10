import { Arguments } from "../types";

export class Field<A extends Arguments, T> {
  constructor(private readonly args: A, private readonly selection: T) {}
}
