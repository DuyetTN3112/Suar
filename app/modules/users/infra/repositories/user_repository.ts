import * as analyticsQueries from './read/analytics_queries.js'
import * as modelQueries from './read/model_queries.js'
import * as userMutations from './write/user_mutations.js'

const UserRepository = {
  ...modelQueries,
  ...analyticsQueries,
  ...userMutations,
}

export type {
  FeaturedSkillReviewRow,
  TaskAssignmentMetricsRow,
  TopReviewedSkillRow,
  UserCreatedAtRow,
  UserSkillAggregationRow,
} from './read/types.js'

export default UserRepository
