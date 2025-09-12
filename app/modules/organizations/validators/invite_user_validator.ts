interface InviteUserInput {
  email?: string | null
  org_id?: string | null
  role_id?: string | null
  message?: string | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SCRIPT_PATTERN = /<script\b|<\/script>/i

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  })
}

export function validateInviteUser(input: InviteUserInput): ValidationResult {
  const errors: string[] = []
  const email = input.email?.trim() ?? ''
  const orgId = input.org_id?.trim() ?? ''
  const roleId = input.role_id?.trim() ?? ''
  const message = input.message ?? ''

  if (!email) {
    errors.push('Email is required')
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('Invalid email format')
  }

  if (!orgId) {
    errors.push('Organization ID is required')
  }

  if (!roleId) {
    errors.push('Role ID is required')
  }

  if (message.length > 500) {
    errors.push('Message must be at most 500 characters')
  }

  if (SCRIPT_PATTERN.test(message) || hasControlCharacters(message)) {
    errors.push('Message contains invalid characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
