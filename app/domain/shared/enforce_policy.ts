/**
 * @deprecated Import from '#actions/shared/enforce_policy' instead.
 *
 * This file re-exports enforcePolicy from the Application layer.
 * enforcePolicy uses AdonisJS exceptions and does NOT belong in the Domain layer.
 * Kept for backward compatibility during migration.
 */
export { enforcePolicy } from '#actions/shared/enforce_policy'
