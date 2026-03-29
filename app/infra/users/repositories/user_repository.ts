import * as analyticsQueries from './user_repository/analytics_queries.js'
import * as modelQueries from './user_repository/model_queries.js'

const UserRepository = {
  ...modelQueries,
  ...analyticsQueries,
}

export type {
  FeaturedSkillReviewRow,
  TaskAssignmentMetricsRow,
  TopReviewedSkillRow,
  UserCreatedAtRow,
  UserSkillAggregationRow,
} from './user_repository/types.js'

export default UserRepository
