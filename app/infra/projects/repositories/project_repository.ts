import * as accessQueries from './project_repository/access_queries.js'
import * as modelQueries from './project_repository/model_queries.js'

const ProjectRepository = {
  ...modelQueries,
  ...accessQueries,
}

export default ProjectRepository
