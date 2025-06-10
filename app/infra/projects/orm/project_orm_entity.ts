/**
 * Project ORM Entity — Infrastructure Layer
 *
 * Re-exports the Lucid ORM model as the ORM entity for the project module.
 * In AdonisJS, models define table mappings and column decorators.
 * This file serves as the infrastructure layer's reference to the ORM entity.
 *
 * Equivalent to `project.orm.entity.ts` in NestJS Clean Architecture.
 */

export { default as ProjectOrmEntity } from '#models/project'
