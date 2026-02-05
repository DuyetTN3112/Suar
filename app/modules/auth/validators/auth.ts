import vine from '@vinejs/vine'

/**
 * Rule cơ bản cho email
 */
export const emailRule = vine.string().maxLength(254).email().normalizeEmail()
