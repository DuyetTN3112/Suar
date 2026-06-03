/** Observability-owned query base reserved for future read-side actions. */
export abstract class BaseQuery<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>
}
