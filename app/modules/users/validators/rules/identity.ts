import vine from '@vinejs/vine'

export const emailRule = vine.string().maxLength(254).email().normalizeEmail()

export const newEmailRule = emailRule.clone().unique(async (db, value) => {
  const exists = (await db.from('users').where('email', value).select('id').first()) as {
    id: string
  } | null
  return !exists
})

export const newUsernameRule = vine
  .string()
  .maxLength(50)
  .unique(async (db, value) => {
    const exists = (await db.from('users').where('username', value).select('id').first()) as {
      id: string
    } | null
    return !exists
  })
