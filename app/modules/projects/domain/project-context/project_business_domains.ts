import ValidationException from '#modules/errors/public_contracts/validation_exception'

/**
 * Lĩnh vực là ngữ cảnh chung của Project. Task chỉ kế thừa ảnh chụp của danh
 * sách này tại lúc được tạo, không tự khai báo một lĩnh vực riêng.
 */
export const PROJECT_BUSINESS_DOMAINS = [
  'fintech',
  'ecommerce',
  'saas',
  'edtech',
  'healthtech',
  'logistics',
  'media',
  'gaming',
  'security',
  'data_platform',
  'internal_tooling',
  'infrastructure',
  'other',
] as const

export type ProjectBusinessDomain = (typeof PROJECT_BUSINESS_DOMAINS)[number]

const PROJECT_BUSINESS_DOMAIN_SET = new Set<string>(PROJECT_BUSINESS_DOMAINS)

export function normalizeProjectBusinessDomains(value: unknown): ProjectBusinessDomain[] {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ValidationException('Lĩnh vực Project phải là một danh sách')
  }

  const normalized = value.map((item) => {
    if (typeof item !== 'string') {
      throw new ValidationException('Lĩnh vực Project không hợp lệ')
    }

    const domain = item.trim().toLowerCase()
    if (!PROJECT_BUSINESS_DOMAIN_SET.has(domain)) {
      throw new ValidationException(`Lĩnh vực Project không hợp lệ: ${item}`)
    }

    return domain as ProjectBusinessDomain
  })

  return [...new Set(normalized)]
}
