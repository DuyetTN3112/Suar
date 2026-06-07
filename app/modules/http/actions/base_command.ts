/** HTTP-owned command base. HTTP actions keep their own boundary and Result adapters. */
export abstract class BaseCommand<
  TArgs extends readonly unknown[] = readonly unknown[],
  TOutput = unknown,
> {
  abstract execute(...args: TArgs): TOutput | Promise<TOutput>
}
