/**
 * Profile completeness policy.
 *
 * Pure function to calculate profile completion percentage.
 * The domain owns which profile facts contribute to completion.
 */
export function calculateProfileCompleteness(user: {
  username?: string | null
  email?: string | null
  avatar_url?: string | null
  bio?: string | null
  phone?: string | null
  skills?: unknown[]
}): number {
  const fields = [
    user.username,
    user.email,
    user.avatar_url,
    user.bio,
    user.phone,
    user.skills && user.skills.length > 0,
  ]
  const filledFields = fields.filter(Boolean).length
  return Math.round((filledFields / fields.length) * 100)
}
