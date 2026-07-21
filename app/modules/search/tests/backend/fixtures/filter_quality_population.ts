export type FilterQualityPrincipal =
  | { kind: 'anonymous' }
  | { kind: 'user'; userId: string }
  | { kind: 'organization'; organizationId: string; role: 'member' | 'manager' | 'admin' }

export type FilterQualityEntity = {
  id: string
  visibility: 'public' | 'private' | 'organization'
  ownerId?: string
  organizationId?: string
  facetValues: readonly string[]
  primaryLabels: readonly string[]
  secondaryLabels: readonly string[]
  secretValue: string
}

export type FilterQualityPopulation = {
  seed: string
  entities: readonly FilterQualityEntity[]
}

export function makeFilterQualityPopulation(
  seed = 'wp-26b-filter-quality-seed-001'
): FilterQualityPopulation {
  return {
    seed,
    entities: [
      {
        id: 'public-primary-typescript',
        visibility: 'public',
        facetValues: ['engineering', 'typescript'],
        primaryLabels: ['frontend'],
        secondaryLabels: ['typescript'],
        secretValue: 'public-value',
      },
      {
        id: 'public-secondary-postgres',
        visibility: 'public',
        facetValues: ['engineering', 'postgresql'],
        primaryLabels: ['backend'],
        secondaryLabels: ['postgresql'],
        secretValue: 'public-secondary-value',
      },
      {
        id: 'private-user-1',
        visibility: 'private',
        ownerId: 'user-1',
        facetValues: ['engineering', 'secret-skill'],
        primaryLabels: ['backend'],
        secondaryLabels: ['secret-skill'],
        secretValue: 'hidden-user-1-secret',
      },
      {
        id: 'org-acme-secondary-redis',
        visibility: 'organization',
        organizationId: 'org-acme',
        facetValues: ['engineering', 'redis'],
        primaryLabels: ['platform'],
        secondaryLabels: ['redis'],
        secretValue: 'acme-secret',
      },
      {
        id: 'org-other-secret',
        visibility: 'organization',
        organizationId: 'org-other',
        facetValues: ['engineering', 'cross-tenant-secret'],
        primaryLabels: ['platform'],
        secondaryLabels: ['cross-tenant-secret'],
        secretValue: 'foreign-org-secret',
      },
    ],
  }
}

export function eligibleEntities(
  population: FilterQualityPopulation,
  principal: FilterQualityPrincipal
): readonly FilterQualityEntity[] {
  return population.entities.filter((entity) => {
    if (entity.visibility === 'public') return true
    if (entity.visibility === 'private') {
      return principal.kind === 'user' && entity.ownerId === principal.userId
    }
    return principal.kind === 'organization' && entity.organizationId === principal.organizationId
  })
}

export function facetCounts(
  entities: readonly FilterQualityEntity[]
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const entity of entities) {
    for (const facet of entity.facetValues) counts[facet] = (counts[facet] ?? 0) + 1
  }
  return counts
}

export function secondaryLabelIds(
  entities: readonly FilterQualityEntity[],
  label: string
): readonly string[] {
  return entities
    .filter((entity) => entity.secondaryLabels.includes(label))
    .map((entity) => entity.id)
}
