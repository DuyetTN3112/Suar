import { ProjectPublicApi } from '#modules/projects/actions/services/project_public_api'
import { ProjectCacheInvalidator } from '#modules/projects/infra/cache/project_cache_invalidator'

export function makeProjectPublicApi(): ProjectPublicApi {
  return new ProjectPublicApi(new ProjectCacheInvalidator())
}
