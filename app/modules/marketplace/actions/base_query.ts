/**
 * Marketplace-owned query base.
 *
 * Queries that compose an existing Result-producing capability keep that
 * Result as their output; this avoids the nested-Result anti-pattern while
 * keeping the query hierarchy local to Marketplace.
 */
export abstract class BaseQuery<TInput, TOutput> {
  abstract handle(input: TInput): Promise<TOutput>
}
