import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskSkillEligibility } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export function assertTaskSkillEligibility(
  eligibility: TaskSkillEligibility,
  action: 'ứng tuyển' | 'giao task'
): void {
  if (eligibility.isEligible) return

  const requirements = eligibility.unmetRequirements
    .map((requirement) => {
      const actualLevel = requirement.actualLevel
        ? requirement.actualLevel.toUpperCase()
        : 'chưa có mức đã xác minh'
      return `${requirement.skillName}: cần ${requirement.requiredLevel.toUpperCase()}, hiện ${actualLevel}`
    })
    .join('; ')

  throw new ValidationException(`Không thể ${action} vì chưa đạt kỹ năng tối thiểu của task: ${requirements}`)
}
