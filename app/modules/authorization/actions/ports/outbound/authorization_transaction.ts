/**
 * Authorization-owned transaction context.
 *
 * The application layer deliberately treats a transaction as opaque. Lucid
 * adapters may narrow it to their concrete client type at the composition
 * boundary.
 */
export type AuthorizationTransaction = object
