import { Arguments } from "../types";

export class Args<A extends Arguments> {
  constructor(private readonly args: A) {}
}

export function args<A extends Arguments>(args: A): Args<A> {
  return new Args(args);
}
