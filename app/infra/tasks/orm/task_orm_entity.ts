/**
 * Task ORM Entity — Infrastructure Layer
 *
 * Re-exports the Lucid ORM model as the ORM entity for the task module.
 * In AdonisJS, models define table mappings and column decorators.
 * This file serves as the infrastructure layer's reference to the ORM entity.
 *
 * Equivalent to `task.orm.entity.ts` in NestJS Clean Architecture.
 */

export { default as TaskOrmEntity } from '#models/task'
