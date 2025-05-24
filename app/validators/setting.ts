import vine from '@vinejs/vine'

/**
 * Validator cho cập nhật cài đặt tài khoản
 */
export const accountSettingValidator = vine.compile(
  vine.object({
    firstName: vine.string().maxLength(100),
    lastName: vine.string().maxLength(100),
    phoneNumber: vine.string().maxLength(20).optional(),
    bio: vine.string().maxLength(1000).optional(),
    dateOfBirth: vine.date().optional(),
    language: vine.string().maxLength(10).optional(),
  })
)

/**
 * Validator cho cập nhật cài đặt giao diện
 */
export const appearanceSettingValidator = vine.compile(
  vine.object({
    theme: vine.string().maxLength(20),
    displayMode: vine.string().maxLength(20),
  })
)

/**
 * Validator cho cập nhật cài đặt thông báo
 */
export const notificationSettingValidator = vine.compile(
  vine.object({
    notificationsEnabled: vine.boolean(),
  })
)

/**
 * NOTE: Removed passwordUpdateValidator - no password changes in OAuth-only system
 */
