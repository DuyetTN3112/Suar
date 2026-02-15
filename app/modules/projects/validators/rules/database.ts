import vine from '@vinejs/vine'

import {
  databaseValueExists,
  type DatabaseExistsClient,
} from '#modules/errors/public_contracts/database_validation'

export function projectDatabaseValueExists(
  queryDb: DatabaseExistsClient,
  table: string,
  column: string,
  value: string,
  options: { softDelete?: boolean } = {}
): Promise<boolean> {
  return databaseValueExists(queryDb, table, column, value, {
    operation: 'project_validation.exists',
    ...options,
  })
}

const existsRule = (table: string, column = 'id', options: { softDelete?: boolean } = {}) => {
  return vine
    .string()
    .uuid()
    .exists((queryDb, value) => {
      return projectDatabaseValueExists(queryDb, table, column, value, options)
    })
}

export const projectIdRule = () => existsRule('projects', 'id', { softDelete: true })
export const organizationIdRule = () => existsRule('organizations', 'id', { softDelete: true })
export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
