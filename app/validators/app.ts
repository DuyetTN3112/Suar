import vine from '@vinejs/vine'

/**
 * Validator cho tạo danh mục ứng dụng mới
 */
export const createAppCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(100),
    description: vine.string().maxLength(255).optional(),
  })
)

/**
 * Validator cho cập nhật danh mục ứng dụng
 */
export const updateAppCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(100),
    description: vine.string().maxLength(255).optional(),
  })
)

/**
 * Validator cho tạo ứng dụng mới
 */
export const createAppValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(100),
    logo: vine.string().maxLength(100),
    connected: vine.boolean().optional(),
    description: vine.string().optional(),
    categoryId: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật ứng dụng
 */
export const updateAppValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(100).optional(),
    logo: vine.string().maxLength(100).optional(),
    connected: vine.boolean().optional(),
    description: vine.string().optional(),
    categoryId: vine.number().optional(),
  })
)

/**
 * Validator cho kết nối ứng dụng người dùng
 */
export const connectUserAppValidator = vine.compile(
  vine.object({
    appId: vine.number(),
    isConnected: vine.boolean().optional(),
    accessToken: vine.string().optional(),
    refreshToken: vine.string().optional(),
    expiresAt: vine.date().optional(),
  })
)

/**
 * Validator cho tìm kiếm ứng dụng
 */
export const searchAppsValidator = vine.compile(
  vine.object({
    query: vine.string().optional(),
    category: vine.number().optional(),
    connected: vine.boolean().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
)

/**
 * Validator cho lọc danh mục ứng dụng
 */
export const filterAppCategoriesValidator = vine.compile(
  vine.object({
    query: vine.string().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
)
