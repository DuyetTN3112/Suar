export type ProjectSprintCoreStatus = 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

export type SprintTaskStatusCategory = 'todo' | 'in_progress' | 'done' | 'cancelled'

export interface RuleResult {
  allowed: boolean
  reason?: string
}

const editableSprintStatuses = new Set<ProjectSprintCoreStatus>(['draft', 'active'])

const allowedSprintTransitions = new Map<ProjectSprintCoreStatus, ProjectSprintCoreStatus>([
  ['draft', 'active'],
  ['active', 'review_open'],
  ['review_open', 'review_closed'],
  ['review_closed', 'archived'],
])

export function canAttachTaskToSprint(input: {
  taskProjectId: string | null
  sprintProjectId: string
  sprintStatus: ProjectSprintCoreStatus
}): RuleResult {
  if (!input.taskProjectId || input.taskProjectId !== input.sprintProjectId) {
    return { allowed: false, reason: 'Task and sprint must belong to the same project' }
  }

  if (!editableSprintStatuses.has(input.sprintStatus)) {
    return { allowed: false, reason: 'Sprint is not editable' }
  }

  return { allowed: true }
}

export function classifySprintTaskCompletion(input: {
  statusCategory: SprintTaskStatusCategory
}): 'completed' | 'carry_over' {
  return input.statusCategory === 'done' || input.statusCategory === 'cancelled'
    ? 'completed'
    : 'carry_over'
}

export function canTransitionProjectSprint(input: {
  from: ProjectSprintCoreStatus
  to: ProjectSprintCoreStatus
  actorCanManageSprint: boolean
}): RuleResult {
  if (!input.actorCanManageSprint) {
    return { allowed: false, reason: 'Actor cannot manage project sprint' }
  }

  if (input.from === input.to) {
    return { allowed: true }
  }

  if (allowedSprintTransitions.get(input.from) !== input.to) {
    return {
      allowed: false,
      reason: `Project sprint cannot transition from ${input.from} to ${input.to}`,
    }
  }

  return { allowed: true }
}
