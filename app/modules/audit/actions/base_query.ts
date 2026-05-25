/** Audit-owned query base for audit read actions. */
export abstract class BaseQuery<
  TArgs extends readonly unknown[] = readonly unknown[],
  TOutput = unknown,
> {
  abstract execute(...args: TArgs): TOutput | Promise<TOutput>
}
