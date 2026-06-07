/** HTTP-owned query base. It does not depend on another module's action base. */
export abstract class BaseQuery<
  TArgs extends readonly unknown[] = readonly unknown[],
  TOutput = unknown,
> {
  abstract execute(...args: TArgs): TOutput | Promise<TOutput>
}
