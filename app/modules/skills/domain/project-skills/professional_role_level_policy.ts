export interface ProfessionalRoleLevelConfiguration {
  minimumLevelId?: string | null
  targetLevelId?: string | null
  assessmentCeilingLevelId?: string | null
}

export interface ProfessionalRoleProficiencyLevel {
  id: string
  scaleId: string
  ordinal: number
}

export function getConfiguredProficiencyLevelIds(
  configuration: ProfessionalRoleLevelConfiguration
): string[] {
  return [
    configuration.minimumLevelId,
    configuration.targetLevelId,
    configuration.assessmentCeilingLevelId,
  ].filter((id): id is string => Boolean(id))
}

export function assertValidProfessionalRoleLevelConfiguration(
  configuration: ProfessionalRoleLevelConfiguration,
  levels: readonly ProfessionalRoleProficiencyLevel[]
): void {
  const configuredLevelIds = getConfiguredProficiencyLevelIds(configuration)
  const levelById = new Map(levels.map((level) => [level.id, level]))

  assertConfiguredLevelsExist(configuredLevelIds, levelById)
  assertLevelsShareScale(levels)
  assertLevelsAreOrdered(configuration, levelById)
}

function assertConfiguredLevelsExist(
  configuredLevelIds: readonly string[],
  levelById: ReadonlyMap<string, ProfessionalRoleProficiencyLevel>
): void {
  for (const id of configuredLevelIds) {
    if (!levelById.has(id)) {
      throw new NotFoundException(`Proficiency level not found: ${id}`)
    }
  }
}

function assertLevelsShareScale(levels: readonly ProfessionalRoleProficiencyLevel[]): void {
  const scaleIds = new Set(levels.map((level) => level.scaleId))
  if (scaleIds.size > 1) {
    throw new ValidationException(
      'All proficiency levels must belong to the same proficiency scale'
    )
  }
}

function assertLevelsAreOrdered(
  configuration: ProfessionalRoleLevelConfiguration,
  levelById: ReadonlyMap<string, ProfessionalRoleProficiencyLevel>
): void {
  const minimumLevel = getConfiguredLevel(configuration.minimumLevelId, levelById)
  const targetLevel = getConfiguredLevel(configuration.targetLevelId, levelById)
  const ceilingLevel = getConfiguredLevel(configuration.assessmentCeilingLevelId, levelById)

  if (minimumLevel && targetLevel && minimumLevel.ordinal > targetLevel.ordinal) {
    throw new ValidationException('Minimum level ordinal must be <= target level ordinal')
  }
  if (targetLevel && ceilingLevel && targetLevel.ordinal > ceilingLevel.ordinal) {
    throw new ValidationException(
      'Target level ordinal must be <= assessment ceiling level ordinal'
    )
  }
  if (minimumLevel && ceilingLevel && minimumLevel.ordinal > ceilingLevel.ordinal) {
    throw new ValidationException(
      'Minimum level ordinal must be <= assessment ceiling level ordinal'
    )
  }
}

function getConfiguredLevel(
  id: string | null | undefined,
  levelById: ReadonlyMap<string, ProfessionalRoleProficiencyLevel>
): ProfessionalRoleProficiencyLevel | undefined {
  return id ? levelById.get(id) : undefined
}
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
