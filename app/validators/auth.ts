import vine from '@vinejs/vine'

/**
 * Rule cơ bản cho email
 */
export const emailRule = vine.string().maxLength(254).email().normalizeEmail()

/**
 * Rule cho email mới (kiểm tra duy nhất)
 */
export const newEmailRule = emailRule.clone().unique(async (db, value) => {
  const exists = await db.from('users').where('email', value).select('id').first()
  return !exists
})

/**
 * Rule cho username mới (kiểm tra duy nhất)
 */
export const newUsernameRule = vine
  .string()
  .maxLength(50)
  .unique(async (db, value) => {
    const exists = await db.from('users').where('username', value).select('id').first()
    return !exists
  })

/**
 * NOTE: Removed password-related validators:
 * - loginValidator (no more email/password login)
 * - registerValidator (no more manual registration)
 * - forgotPasswordValidator (no more password reset)
 * - resetPasswordValidator (no more password reset)
 *
 * Authentication is now OAuth-only (Google, GitHub)
 */
