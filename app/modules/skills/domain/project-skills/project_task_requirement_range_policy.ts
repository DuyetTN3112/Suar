import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface ProjectTaskRequirementRange {
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
}

export interface ProjectTaskRequirementProficiencyLevel {
  id: string
  scaleId: string
  ordinal: number
}

export function getProjectTaskRequirementRangeLevelIds(
  range: ProjectTaskRequirementRange
): string[] {
  return [range.minimumTaskRequirementLevelId, range.maximumTaskRequirementLevelId].filter(
    (id): id is string => Boolean(id)
  )
}

export function assertValidProjectTaskRequirementRange(
  range: ProjectTaskRequirementRange,
  levels: readonly ProjectTaskRequirementProficiencyLevel[],
  options: { allowUnconfigured?: boolean } = {}
): void {
  const minimumLevelId = range.minimumTaskRequirementLevelId ?? null
  const maximumLevelId = range.maximumTaskRequirementLevelId ?? null
  if (!minimumLevelId && !maximumLevelId) {
    if (options.allowUnconfigured) return
    throw new ValidationException(
      'Kỹ năng của Project phải chọn cả mức task thấp nhất và mức task cao nhất'
    )
  }
  if (!minimumLevelId || !maximumLevelId) {
    throw new ValidationException(
      'Khoảng level của kỹ năng Project phải có cả mức thấp nhất và cao nhất'
    )
  }

  const levelById = new Map(levels.map((level) => [level.id, level]))
  const minimumLevel = levelById.get(minimumLevelId)
  const maximumLevel = levelById.get(maximumLevelId)
  if (!minimumLevel) {
    throw new NotFoundException(`Proficiency level not found: ${minimumLevelId}`)
  }
  if (!maximumLevel) {
    throw new NotFoundException(`Proficiency level not found: ${maximumLevelId}`)
  }
  if (minimumLevel.scaleId !== maximumLevel.scaleId) {
    throw new ValidationException('Hai đầu khoảng level phải thuộc cùng một thang kỹ năng')
  }
  if (minimumLevel.ordinal > maximumLevel.ordinal) {
    throw new ValidationException('Mức thấp nhất của Project không được cao hơn mức cao nhất')
  }
}
