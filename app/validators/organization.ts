import vine from '@vinejs/vine'

/**
 * Validator cho xử lý yêu cầu tham gia tổ chức
 */
export const processJoinRequestValidator = vine.create(
  vine.object({
    action: vine.enum(['approve', 'reject'] as const),
  })
)
