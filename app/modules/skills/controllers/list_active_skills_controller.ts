import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'

@inject()
export default class ListActiveSkillsController {
  constructor(private readonly listActiveSkills: ListActiveSkillsCatalogQuery) {}

  async handle({ request }: HttpContext) {
    const q = request.input('q') as unknown
    const skills = await this.listActiveSkills.handle(
      typeof q === 'string' ? { q } : {}
    )

    return wrapApiV1Data(skills)
  }
}
