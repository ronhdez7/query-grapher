export class Variable<T extends string | undefined = string | undefined> {
  constructor(private readonly name?: T) {}

  getName(): T | undefined {
    return this.name;
  }
}
