import vine from '@vinejs/vine'

/**
 * Validator cho đăng nhập
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
    remember: vine.boolean().optional(),
  })
)

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
 * Validator cho đăng ký
 */
export const registerValidator = vine.compile(
  vine.object({
    firstName: vine.string().maxLength(100),
    lastName: vine.string().maxLength(100),
    username: newUsernameRule.clone(),
    email: newEmailRule.clone(),
    password: vine.string().minLength(8),
    passwordConfirmation: vine.string().confirmed({ confirmationField: 'password' }),
  })
)

/**
 * Validator cho gửi yêu cầu đặt lại mật khẩu
 */
export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

/**
 * Validator cho đặt lại mật khẩu
 */
export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string(),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
    passwordConfirmation: vine.string().confirmed({ confirmationField: 'password' }),
  })
)
