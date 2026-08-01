import vine from '@vinejs/vine'

import {
  databaseValueExists,
  type DatabaseExistsClient,
} from '#modules/errors/public_contracts/database_validation'

export function userDatabaseValueExists(
  queryDb: DatabaseExistsClient,
  table: string,
  column: string,
  value: string,
  options: { softDelete?: boolean } = {}
): Promise<boolean> {
  return databaseValueExists(queryDb, table, column, value, {
    operation: 'user_validation.exists',
    ...options,
  })
}

const existsRule = (table: string, column = 'id', options: { softDelete?: boolean } = {}) => {
  return vine
    .string()
    .uuid()
    .exists((queryDb, value) => {
      return userDatabaseValueExists(queryDb, table, column, value, options)
    })
}

export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
