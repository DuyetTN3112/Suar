export interface WorkHistoryDeliveryTimingInput {
  dueDate: Date | null
  completedAt: Date | null
}

export interface KnowledgeArtifact extends Record<string, unknown> {
  type: 'retrospective_success' | 'retrospective_improvement'
  content: string
}

export interface PerformanceAggregateRow {
  taskType: string | null
  difficulty: string | null
  businessDomain: string | null
  roleInTask: string | null
  collaborationType: string | null
  actualHours: number | null
  overallQualityScore: number | null
  wasOnTime: boolean | null
  daysEarlyOrLate: number | null
}

export interface SelfAssessmentAccuracyRow {
  selfScore: number | null
  reviewedScore: number | null
}

export interface PerformanceAggregateMetrics {
  totalTasksCompleted: number
  totalHoursWorked: number
  avgQualityScore: number | null
  onTimeDeliveryRate: number | null
  avgDaysEarlyOrLate: number | null
  tasksByType: Record<string, number>
  tasksByDifficulty: Record<string, number>
  tasksByDomain: Record<string, number>
  tasksAsLead: number
  tasksAsSoleContributor: number
  tasksMentoringOthers: number
  longestOnTimeStreak: number
  currentOnTimeStreak: number
  selfAssessmentAccuracy: number | null
}

export interface DomainExpertiseSkillScore {
  skillName: string | null
  assignedLevelCode: string | null
}

export interface DomainExpertiseRow {
  techStack: string[]
  domainTags: string[]
  businessDomain: string | null
  problemCategory: string | null
  skillScores: DomainExpertiseSkillScore[]
}

export interface DomainExpertiseTopSkill extends Record<string, unknown> {
  skill_name: string
  review_mentions: number
  weighted_score: number
}

export interface DomainExpertiseMetrics {
  techStackFrequency: Record<string, number>
  domainFrequency: Record<string, number>
  problemCategoryFrequency: Record<string, number>
  topSkills: DomainExpertiseTopSkill[]
}

function round(value: number, precision: number): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function average(values: number[], precision: number): number | null {
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, precision)
}

function incrementCounter(counter: Record<string, number>, key: string | null): void {
  if (!key) return
  counter[key] = (counter[key] ?? 0) + 1
}

function isLeadRole(role: string | null): boolean {
  if (!role) return false
  const normalized = role.toLowerCase()
  return normalized.includes('lead') || normalized.includes('owner')
}

function isMentoringRole(role: string | null): boolean {
  if (!role) return false
  const normalized = role.toLowerCase()
  return normalized.includes('mentor') || normalized.includes('coach')
}

function isSoleContributor(collaborationType: string | null): boolean {
  if (!collaborationType) return false
  const normalized = collaborationType.toLowerCase()
  return normalized.includes('solo') || normalized.includes('individual')
}

function computeStreaks(rows: PerformanceAggregateRow[]): {
  longestOnTimeStreak: number
  currentOnTimeStreak: number
} {
  let longest = 0
  let current = 0

  for (const row of rows) {
    if (row.wasOnTime === true) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return {
    longestOnTimeStreak: longest,
    currentOnTimeStreak: current,
  }
}

function getLevelWeight(levelCode: string | null): number {
  switch (levelCode) {
    case 'expert':
      return 4
    case 'advanced':
      return 3
    case 'intermediate':
      return 2
    default:
      return 1
  }
}

export function calculateWorkHistoryDeliveryTiming(input: WorkHistoryDeliveryTimingInput): {
  wasOnTime: boolean | null
  daysEarlyOrLate: number | null
} {
  if (!input.dueDate || !input.completedAt) {
    return { wasOnTime: null, daysEarlyOrLate: null }
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const diffDays = Math.round(
    (input.completedAt.getTime() - input.dueDate.getTime()) / millisecondsPerDay
  )

  return {
    wasOnTime: diffDays <= 0,
    daysEarlyOrLate: diffDays,
  }
}

export function buildKnowledgeArtifacts(input: {
  whatWentWell: string | null
  whatWouldDoDifferent: string | null
}): KnowledgeArtifact[] {
  const artifacts: KnowledgeArtifact[] = []

  if (input.whatWentWell) {
    artifacts.push({
      type: 'retrospective_success',
      content: input.whatWentWell,
    })
  }

  if (input.whatWouldDoDifferent) {
    artifacts.push({
      type: 'retrospective_improvement',
      content: input.whatWouldDoDifferent,
    })
  }

  return artifacts
}

export function calculateAverageScore(values: Array<number | null | undefined>): number | null {
  return average(
    values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
    2
  )
}

export function calculatePerformanceAggregateMetrics(input: {
  rows: PerformanceAggregateRow[]
  selfAssessmentRows: SelfAssessmentAccuracyRow[]
}): PerformanceAggregateMetrics {
  const { rows, selfAssessmentRows } = input
  const totalTasksCompleted = rows.length
  const totalHoursWorked = round(
    rows.reduce((sum, row) => sum + (row.actualHours ?? 0), 0),
    2
  )

  const avgQualityScore = average(
    rows
      .map((row) => row.overallQualityScore)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
    2
  )

  const onTimeRows = rows.filter((row) => row.wasOnTime !== null)
  const onTimeCount = onTimeRows.filter((row) => row.wasOnTime === true).length
  const onTimeDeliveryRate =
    onTimeRows.length > 0 ? round((onTimeCount / onTimeRows.length) * 100, 2) : null

  const avgDaysEarlyOrLate = average(
    rows
      .map((row) => row.daysEarlyOrLate)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
    2
  )

  const tasksByType: Record<string, number> = {}
  const tasksByDifficulty: Record<string, number> = {}
  const tasksByDomain: Record<string, number> = {}

  let tasksAsLead = 0
  let tasksAsSoleContributor = 0
  let tasksMentoringOthers = 0

  for (const row of rows) {
    incrementCounter(tasksByType, row.taskType)
    incrementCounter(tasksByDifficulty, row.difficulty)
    incrementCounter(tasksByDomain, row.businessDomain)

    if (isLeadRole(row.roleInTask)) tasksAsLead += 1
    if (isSoleContributor(row.collaborationType)) tasksAsSoleContributor += 1
    if (isMentoringRole(row.roleInTask)) tasksMentoringOthers += 1
  }

  const { longestOnTimeStreak, currentOnTimeStreak } = computeStreaks(rows)

  const selfAssessmentDiffs = selfAssessmentRows
    .map((row) => {
      if (row.selfScore === null || row.reviewedScore === null) return null
      return Math.abs(row.selfScore - row.reviewedScore)
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const selfAssessmentAccuracy =
    selfAssessmentDiffs.length > 0
      ? Math.max(
          0,
          round(
            100 -
              (selfAssessmentDiffs.reduce((sum, value) => sum + value, 0) /
                selfAssessmentDiffs.length /
                4) *
                100,
            2
          )
        )
      : null

  return {
    totalTasksCompleted,
    totalHoursWorked,
    avgQualityScore,
    onTimeDeliveryRate,
    avgDaysEarlyOrLate,
    tasksByType,
    tasksByDifficulty,
    tasksByDomain,
    tasksAsLead,
    tasksAsSoleContributor,
    tasksMentoringOthers,
    longestOnTimeStreak,
    currentOnTimeStreak,
    selfAssessmentAccuracy,
  }
}

export function calculateDomainExpertiseMetrics(
  rows: DomainExpertiseRow[]
): DomainExpertiseMetrics {
  const techStackFrequency: Record<string, number> = {}
  const domainFrequency: Record<string, number> = {}
  const problemCategoryFrequency: Record<string, number> = {}
  const skillTotals: Record<string, { count: number; weightedSum: number }> = {}

  for (const row of rows) {
    for (const tech of row.techStack) {
      incrementCounter(techStackFrequency, tech)
    }

    for (const domainTag of row.domainTags) {
      incrementCounter(domainFrequency, domainTag)
    }

    incrementCounter(domainFrequency, row.businessDomain)
    incrementCounter(problemCategoryFrequency, row.problemCategory)

    for (const skill of row.skillScores) {
      if (!skill.skillName) continue

      const current = skillTotals[skill.skillName] ?? { count: 0, weightedSum: 0 }
      current.count += 1
      current.weightedSum += getLevelWeight(skill.assignedLevelCode)
      skillTotals[skill.skillName] = current
    }
  }

  const topSkills = Object.entries(skillTotals)
    .map(([skillName, values]) => ({
      skill_name: skillName,
      review_mentions: values.count,
      weighted_score: round(values.weightedSum / Math.max(values.count, 1), 2),
    }))
    .sort((a, b) => {
      if (b.weighted_score === a.weighted_score) {
        return b.review_mentions - a.review_mentions
      }
      return b.weighted_score - a.weighted_score
    })
    .slice(0, 12)

  return {
    techStackFrequency,
    domainFrequency,
    problemCategoryFrequency,
    topSkills,
  }
}
