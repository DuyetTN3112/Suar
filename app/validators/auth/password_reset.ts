import vine from '@vinejs/vine'

export const passwordResetSendValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
  })
)

export const passwordResetValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(8).confirmed(),
    password_confirmation: vine.string(),
    value: vine.string(),
  })
)
