import type { ProjectSprintCoreStatus, RuleResult, SprintTaskStatusCategory } from '#modules/sprints/domain/project-sprint/sprint_core_rules'

export type BacklogLocation = 'backlog' | 'sprint'
export type SprintTaskOutcome =
  | 'historical_done'
  | 'historical_cancelled'
  | 'historical_rejected'
  | 'requires_destination'
export type IncompleteTaskDestination =
  | { kind: 'backlog' }
  | { kind: 'sprint'; sprintId: string }

export function classifySprintTaskOutcome(input: {
  statusCategory: SprintTaskStatusCategory | string
}): SprintTaskOutcome {
  switch (input.statusCategory) {
    case 'done':
      return 'historical_done'
    case 'cancelled':
      return 'historical_cancelled'
    case 'rejected':
      return 'historical_rejected'
    default:
      return 'requires_destination'
  }
}

export function canStartProjectSprint(input: {
  currentStatus: ProjectSprintCoreStatus
  activeSprintCount: number
  actorCanManageSprint: boolean
  startsAt: Date
  endsAt: Date
}): RuleResult {
  if (!input.actorCanManageSprint) {
    return { allowed: false, reason: 'Actor cannot manage project sprint' }
  }
  if (input.currentStatus !== 'draft') {
    return { allowed: false, reason: 'Only draft sprints can be started' }
  }
  if (input.activeSprintCount > 0) {
    return { allowed: false, reason: 'Project already has an active sprint' }
  }
  if (
    Number.isNaN(input.startsAt.getTime()) ||
    Number.isNaN(input.endsAt.getTime()) ||
    input.endsAt.getTime() <= input.startsAt.getTime()
  ) {
    return { allowed: false, reason: 'Project sprint schedule is invalid' }
  }
  return { allowed: true }
}

export function normalizeBacklogRank(value: unknown): number {
  const rank = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(rank)) return 0
  return Math.max(0, rank)
}
