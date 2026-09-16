/**
 * Base Query for Moderation & Anti-Fraud Bounded Context.
 */
export abstract class BaseQuery<TInput, TOutput> {
  abstract handle(input: TInput): Promise<TOutput>

  async execute(input: TInput): Promise<TOutput> {
    return this.handle(input)
  }
}
