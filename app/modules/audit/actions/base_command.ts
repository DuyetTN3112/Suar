/** Audit-owned command base for audit write and event actions. */
export abstract class BaseCommand<
  TArgs extends readonly unknown[] = readonly unknown[],
  TOutput = unknown,
> {
  abstract execute(...args: TArgs): TOutput | Promise<TOutput>
}
