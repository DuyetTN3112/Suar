import type { UserKey } from './types.js'

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
    level: 'senior',
    totalReviews: 4,
    avgPercentage: 91,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'postgresql',
    level: 'middle',
    totalReviews: 3,
    avgPercentage: 84,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'testing',
    level: 'middle',
    totalReviews: 3,
    avgPercentage: 82,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'communication',
    level: 'senior',
    totalReviews: 4,
    avgPercentage: 88,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'problem_solving',
    level: 'senior',
    totalReviews: 3,
    avgPercentage: 90,
    source: 'reviewed',
  },
  {
    user: 'member',
    skill: 'svelte',
    level: 'middle',
    totalReviews: 2,
    avgPercentage: 79,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'testing',
    level: 'senior',
    totalReviews: 2,
    avgPercentage: 88,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'communication',
    level: 'senior',
    totalReviews: 2,
    avgPercentage: 86,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'postgresql',
    level: 'senior',
    totalReviews: 2,
    avgPercentage: 86,
    source: 'reviewed',
  },
  {
    user: 'owner',
    skill: 'problem_solving',
    level: 'senior',
    totalReviews: 2,
    avgPercentage: 84,
    source: 'reviewed',
  },
  {
    user: 'orgAdmin',
    skill: 'testing',
    level: 'senior',
    totalReviews: 2,
    avgPercentage: 87,
    source: 'reviewed',
  },
  {
    user: 'orgAdmin',
    skill: 'leadership',
    level: 'lead',
    totalReviews: 2,
    avgPercentage: 85,
    source: 'reviewed',
  },
  {
    user: 'peerReviewer',
    skill: 'testing',
    level: 'senior',
    totalReviews: 1,
    avgPercentage: 83,
    source: 'reviewed',
  },
  {
    user: 'superadmin',
    skill: 'leadership',
    level: 'lead',
    totalReviews: 1,
    avgPercentage: 92,
    source: 'imported',
  },
  {
    user: 'superadmin',
    skill: 'communication',
    level: 'senior',
    totalReviews: 1,
    avgPercentage: 90,
    source: 'imported',
  },
]
