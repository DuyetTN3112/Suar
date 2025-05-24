/**
 * Command Handler Interface
 * Commands are operations that change system state (Write operations)
 *
 * Following CQRS principle: Commands should not return data, only success/failure
 */
export interface CommandHandler<TInput, TOutput = void> {
  /**
   * Execute the command
   * @param input - Command input data (typically a DTO)
   * @returns Promise of operation result
   */
  handle(input: TInput): Promise<TOutput>
}

/**
 * Query Handler Interface
 * Queries are read-only operations that return data (Read operations)
 *
 * Following CQRS principle: Queries should never modify system state
 */
export interface QueryHandler<TInput, TOutput> {
  /**
   * Execute the query
   * @param input - Query input data (typically a DTO)
   * @returns Promise of query result data
   */
  handle(input: TInput): Promise<TOutput>
}

/**
 * Marker interface for Command DTOs
 * Use this to identify Command data transfer objects
 */
export interface Command {}

/**
 * Marker interface for Query DTOs
 * Use this to identify Query data transfer objects
 */
export interface Query {}
