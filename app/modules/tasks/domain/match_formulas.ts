const LEVEL_MAP: Record<string, number> = {
  beginner: 1,
  elementary: 2,
  junior: 3,
  middle: 4,
  senior: 5,
  lead: 6,
  principal: 7,
  master: 8,
}

export interface TaskRequiredSkill {
  skill_id: string
  required_level_code: string
  is_mandatory: boolean
  skill_name: string
  minimumLevelId?: string | null
  targetLevelId?: string | null
  assessmentCeilingLevelId?: string | null
  importance?: string
  weight?: number
  projectSkillId?: string | null
  rubricVersionId?: string | null
}

export interface TaskMatchInput {
  requiredSkills: TaskRequiredSkill[]
  business_domain: string | null
  problem_category: string | null
  task_type: string | null
}

export interface UserSkillInput {
  skill_id: string
  level_code: string
  source: string // 'reviewed' | 'imported'
}

export interface UserWorkHistoryInput {
  business_domain?: string | null
  problem_category?: string | null
  task_type?: string | null
  was_on_time?: boolean | null
}

export interface ApplicantMatchInput {
  skills: UserSkillInput[]
  workHistory: UserWorkHistoryInput[]
  trustScore: number
}

export interface MatchScoreResult {
  match_score: number
  skill_match: number
  domain_match: number
  delivery_reliability: number
  trust_score: number
  explanations: string[]
  risks: string[]
}

export function calculateApplicantMatch(
  task: TaskMatchInput,
  applicant: ApplicantMatchInput
): MatchScoreResult {
  const explanations: string[] = []
  const risks: string[] = []

  // 1. Skill Match Score
  let skillMatch = 100
  if (task.requiredSkills.length > 0) {
    let totalSkillScore = 0
    for (const req of task.requiredSkills) {
      const userSkill = applicant.skills.find((s) => s.skill_id === req.skill_id)
      if (!userSkill) {
        if (req.is_mandatory) {
          risks.push(`Missing mandatory skill ${req.skill_name}`)
        }
      } else {
        const reqLevel = LEVEL_MAP[req.required_level_code] ?? 1
        const userLevel = LEVEL_MAP[userSkill.level_code] ?? 1
        let skillFactor = 1.0

        if (userLevel < reqLevel) {
          skillFactor = userLevel / reqLevel
          if (req.is_mandatory) {
            risks.push(`Level lower than mandatory for skill ${req.skill_name}`)
          }
        }

        const sourceWeight = userSkill.source === 'reviewed' ? 1.0 : 0.5
        const semanticWeight = req.weight ?? 1.0
        const importanceMultiplier = req.importance === 'critical' ? 1.5
          : req.importance === 'high' ? 1.25
          : req.importance === 'low' ? 0.75
          : 1.0
        totalSkillScore += skillFactor * sourceWeight * semanticWeight * importanceMultiplier * 100

        if (userSkill.source === 'reviewed') {
          explanations.push(`Đã có review verified về ${req.skill_name}.`)
        }
      }
    }
    skillMatch = Math.round((totalSkillScore / task.requiredSkills.length) * 10) / 10
  }

  // 2. Domain Match Score
  let domainMatch = 0
  if (applicant.workHistory.length > 0) {
    let domainScore = 0
    let domainCount = 0
    let categoryCount = 0
    let typeCount = 0

    for (const history of applicant.workHistory) {
      if (task.business_domain && history.business_domain === task.business_domain) {
        domainScore += 25
        domainCount++
      }
      if (task.problem_category && history.problem_category === task.problem_category) {
        domainScore += 15
        categoryCount++
      }
      if (task.task_type && history.task_type === task.task_type) {
        domainScore += 10
        typeCount++
      }
    }

    domainMatch = Math.min(100, domainScore)

    if (domainCount > 0) {
      explanations.push(`Từng hoàn thành ${domainCount} công việc trong lĩnh vực ${task.business_domain ?? ''}.`)
    }
    if (categoryCount > 0) {
      explanations.push(`Có kinh nghiệm xử lý ${categoryCount} bài toán thuộc loại ${task.problem_category ?? ''}.`)
    }
    if (typeCount > 0) {
      explanations.push(`Đã làm ${typeCount} công việc cùng dạng ${task.task_type ?? ''}.`)
    }
  }

  // 3. Delivery Reliability Score
  let deliveryReliability = 0
  const validHistory = applicant.workHistory.filter(
    (h) => h.was_on_time !== undefined && h.was_on_time !== null
  )
  if (validHistory.length > 0) {
    const onTimeCount = validHistory.filter((h) => h.was_on_time === true).length
    deliveryReliability = Math.round((onTimeCount / validHistory.length) * 100)
    if (deliveryReliability >= 80) {
      explanations.push(`Tỉ lệ nộp đúng hạn tốt (${deliveryReliability}%).`)
    }
  }

  // 4. Trust Score
  const trustScore = Math.max(0, Math.min(100, applicant.trustScore))

  // 5. Overall Match Score
  const rawOverall =
    skillMatch * 0.4 +
    domainMatch * 0.2 +
    deliveryReliability * 0.2 +
    trustScore * 0.2

  const matchScore = Math.round(rawOverall)

  return {
    match_score: matchScore,
    skill_match: skillMatch,
    domain_match: domainMatch,
    delivery_reliability: deliveryReliability,
    trust_score: trustScore,
    explanations,
    risks,
  }
}
