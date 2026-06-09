/**
 * Marketplace-owned command base.
 *
 * Marketplace commands delegate to a capability that already exposes the
 * canonical Result contract. The base therefore defines the local action
 * shape without wrapping a Result in another Result.
 */
export abstract class BaseCommand<TInput, TOutput> {
  abstract handle(input: TInput): Promise<TOutput>
}
