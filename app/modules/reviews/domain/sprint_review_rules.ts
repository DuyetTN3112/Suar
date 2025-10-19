export type ProjectSprintStatus = 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

export type SprintManagerTargetRole = 'manager' | 'lead' | 'assigner' | 'owner'

export type SprintEnvironmentTargetType = 'project' | 'organization'

export interface RuleResult {
  allowed: boolean
  reason?: string
}

export interface ManagerTargetCandidate {
  userId: string
  assignedTaskCount: number
  createdTaskCount: number
  projectManagerDuringSprint: boolean
  projectOwnerDuringSprint: boolean
  explicitSprintLead: boolean
}

export interface EligibleManagerTarget {
  userId: string
  targetRole: SprintManagerTargetRole
  evidenceCount: number
}

export interface SprintEnvironmentReviewInput {
  targetType: SprintEnvironmentTargetType
  targetId: string
  rating: number
}

export interface SprintManagerReviewInput {
  targetUserId: string
  rating: number
}

const allowedSprintTransitions = new Map<ProjectSprintStatus, ProjectSprintStatus>([
  ['draft', 'active'],
  ['active', 'review_open'],
  ['review_open', 'review_closed'],
  ['review_closed', 'archived'],
])

export function canTransitionProjectSprint(input: {
  from: ProjectSprintStatus
  to: ProjectSprintStatus
  actorCanManageSprint: boolean
}): RuleResult {
  if (!input.actorCanManageSprint) {
    return { allowed: false, reason: 'Actor cannot manage project sprint' }
  }

  if (allowedSprintTransitions.get(input.from) !== input.to) {
    return {
      allowed: false,
      reason: `Project sprint cannot transition from ${input.from} to ${input.to}`,
    }
  }

  return { allowed: true }
}

export function resolveEligibleManagerTargets(input: {
  reviewerId: string
  candidates: ManagerTargetCandidate[]
}): EligibleManagerTarget[] {
  const targets = new Map<string, EligibleManagerTarget>()

  for (const candidate of input.candidates) {
    if (candidate.userId === input.reviewerId) {
      continue
    }

    const evidenceCount = countManagerTargetEvidence(candidate)
    if (evidenceCount === 0) {
      continue
    }

    const existing = targets.get(candidate.userId)
    if (existing) {
      existing.evidenceCount += evidenceCount
      existing.targetRole = rankManagerRole(existing.targetRole) >= rankManagerRole(resolveTargetRole(candidate))
        ? existing.targetRole
        : resolveTargetRole(candidate)
      continue
    }

    targets.set(candidate.userId, {
      userId: candidate.userId,
      targetRole: resolveTargetRole(candidate),
      evidenceCount,
    })
  }

  return Array.from(targets.values()).sort((left, right) => {
    const roleRankDelta = rankManagerRole(right.targetRole) - rankManagerRole(left.targetRole)
    if (roleRankDelta !== 0) {
      return roleRankDelta
    }

    const evidenceDelta = right.evidenceCount - left.evidenceCount
    if (evidenceDelta !== 0) {
      return evidenceDelta
    }

    return left.userId.localeCompare(right.userId)
  })
}

export function validateSprintReviewPackage(input: {
  reviewerId: string
  eligibleManagerTargetIds: string[]
  environmentReviews: SprintEnvironmentReviewInput[]
  managerReviews: SprintManagerReviewInput[]
}): RuleResult {
  const environmentTargetTypes = new Set(input.environmentReviews.map((review) => review.targetType))
  if (!environmentTargetTypes.has('project')) {
    return { allowed: false, reason: 'project environment review is required' }
  }

  if (!environmentTargetTypes.has('organization')) {
    return { allowed: false, reason: 'organization environment review is required' }
  }

  const eligibleManagerTargets = new Set(input.eligibleManagerTargetIds)
  for (const review of input.managerReviews) {
    if (review.targetUserId === input.reviewerId) {
      return { allowed: false, reason: 'Manager self review is not allowed' }
    }

    if (!eligibleManagerTargets.has(review.targetUserId)) {
      return { allowed: false, reason: 'Manager review target must be eligible for this sprint' }
    }
  }

  return { allowed: true }
}

function countManagerTargetEvidence(candidate: ManagerTargetCandidate): number {
  let count = candidate.assignedTaskCount + candidate.createdTaskCount

  if (candidate.projectManagerDuringSprint) count += 1
  if (candidate.projectOwnerDuringSprint) count += 1
  if (candidate.explicitSprintLead) count += 1

  return count
}

function resolveTargetRole(candidate: ManagerTargetCandidate): SprintManagerTargetRole {
  if (candidate.projectOwnerDuringSprint) return 'owner'
  if (candidate.explicitSprintLead) return 'lead'
  if (candidate.projectManagerDuringSprint) return 'manager'
  return 'assigner'
}

function rankManagerRole(role: SprintManagerTargetRole): number {
  const ranks: Record<SprintManagerTargetRole, number> = {
    assigner: 1,
    manager: 2,
    lead: 3,
    owner: 4,
  }
  return ranks[role]
}
