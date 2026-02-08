import type { DatabaseId } from '#types/database'

export function buildUserProfileCacheKeys(userId: DatabaseId): string[] {
  const cacheKeys: string[] = []

  for (const includeSkills of [true, false]) {
    for (const includeSpiderChart of [true, false]) {
      cacheKeys.push(
        `users:profile:includeSkills:${includeSkills}:includeSpiderChart:${includeSpiderChart}:userId:${userId}`
      )
    }
  }

  return cacheKeys
}

export function buildUserSkillsCacheKeys(
  userId: DatabaseId,
  categoryCodes: (string | null | undefined)[] = []
): string[] {
  const categories = new Set<string>(['all'])

  for (const categoryCode of categoryCodes) {
    if (categoryCode) {
      categories.add(categoryCode)
    }
  }

  return [...categories].map((categoryCode) => {
    return `users:skills:category:${categoryCode}:userId:${userId}`
  })
}
