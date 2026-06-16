/** Observability-owned command base for multi-argument runtime actions. */
export abstract class BaseCommand<TArgs extends readonly unknown[], TOutput> {
  abstract execute(...args: TArgs): Promise<TOutput>
}
