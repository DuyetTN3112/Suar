import vine from '@vinejs/vine'

const existsRule = (table: string, column = 'id', options: { softDelete?: boolean } = {}) => {
  return vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const query = queryDb.from(table).where(column, value)
      if (options.softDelete) void query.whereNull('deleted_at')
      const row = (await query.select(column).first()) as unknown
      return row !== null && row !== undefined
    })
}

export const projectIdRule = () => existsRule('projects', 'id', { softDelete: true })
export const organizationIdRule = () => existsRule('organizations', 'id', { softDelete: true })
export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
