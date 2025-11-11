import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'

export default class ListActiveSkillsController {
  async handle({ request }: HttpContext) {
    const q = request.input('q') as unknown
    const skills = await new ListActiveSkillsCatalogQuery().handle(
      typeof q === 'string' ? { q } : {}
    )

    return wrapApiV1Data(skills)
  }
}
