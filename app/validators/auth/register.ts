import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2).maxLength(100),
    lastName: vine.string().trim().minLength(2).maxLength(100),
    username: vine.string().trim().minLength(3).maxLength(100).alphaNumeric(),
    email: vine.string().email().trim().toLowerCase(),
    password: vine.string().minLength(8).confirmed(),
    passwordConfirmation: vine.string(),
  })
)
