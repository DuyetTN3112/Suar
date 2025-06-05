/**
 * Organization ORM Entity — Infrastructure Layer
 *
 * Re-exports the Lucid ORM model as the ORM entity for the organization module.
 * In AdonisJS, models define table mappings and column decorators.
 * This file serves as the infrastructure layer's reference to the ORM entity.
 *
 * Equivalent to `organization.orm.entity.ts` in NestJS Clean Architecture.
 */

export { default as OrganizationOrmEntity } from '#models/organization'
