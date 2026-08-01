import vine from '@vinejs/vine'

const MARKETPLACE_APPLICATION_SOURCES = ['public_listing', 'invitation', 'referral'] as const
const MARKETPLACE_ASSIGNMENT_TYPES = ['member', 'external_contributor', 'volunteer'] as const

export const applyMarketplaceTaskRequestValidator = vine.create(
  vine.object({
    message: vine.string().optional(),
    portfolio_links: vine.array(vine.string()).optional(),
    application_source: vine.enum(MARKETPLACE_APPLICATION_SOURCES),
  })
)

export const processMarketplaceApplicationRequestValidator = vine.create(
  vine.object({
    action: vine.enum(['approve', 'reject'] as const),
    rejection_reason: vine.string().optional(),
    assignment_type: vine.enum(MARKETPLACE_ASSIGNMENT_TYPES),
    estimated_hours: vine.number().optional(),
  })
)
