import type { UserKey } from './types.js'

import { CanonicalProficiencyLevelCode } from '#modules/skills/constants/proficiency_level_constants'

export interface UserSkillSpec {
  user: UserKey
  skill: string
  level: string
  totalReviews: number
  avgPercentage: number
  source: 'reviewed' | 'imported'
}

export const SEED_USER_SKILLS_SPECS: UserSkillSpec[] = [
  {
    user: 'member',
    skill: 'typescript',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 4,
    avgPercentage: 91,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'postgresql',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 3,
    avgPercentage: 84,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'testing',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 3,
    avgPercentage: 82,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'communication',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 4,
    avgPercentage: 88,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'planning',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 3,
    avgPercentage: 81,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'problem_solving',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 3,
    avgPercentage: 90,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'svelte',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 2,
    avgPercentage: 79,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'testing',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 2,
    avgPercentage: 88,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'communication',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 2,
    avgPercentage: 86,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'postgresql',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 2,
    avgPercentage: 86,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'problem_solving',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 2,
    avgPercentage: 84,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'svelte',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 0,
    avgPercentage: 72,
    source: 'imported',
  },
  {
    user: 'owner',
    skill: 'code_review',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 0,
    avgPercentage: 76,
    source: 'imported',
  },
  {
    user: 'owner',
    skill: 'release_management',
    level: CanonicalProficiencyLevelCode.L7,
    totalReviews: 1,
    avgPercentage: 80,
    source: 'reviewed',
  },
  {
    user: 'orgAdmin',
    skill: 'testing',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 2,
    avgPercentage: 87,
    source: 'reviewed',
  },
  {
    user: 'orgAdmin',
    skill: 'leadership',
    level: CanonicalProficiencyLevelCode.L12,
    totalReviews: 2,
    avgPercentage: 85,
    source: 'reviewed',
  },
  {
    user: 'peerReviewer',
    skill: 'testing',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 1,
    avgPercentage: 83,
    source: 'reviewed',
  },
  {
    user: 'superadmin',
    skill: 'leadership',
    level: CanonicalProficiencyLevelCode.L12,
    totalReviews: 1,
    avgPercentage: 92,
    source: 'imported',
  },
  {
    user: 'superadmin',
    skill: 'communication',
    level: CanonicalProficiencyLevelCode.L10,
    totalReviews: 1,
    avgPercentage: 90,
    source: 'imported',
  },
]
