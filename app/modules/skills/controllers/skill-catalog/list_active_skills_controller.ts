import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'

@inject()
export default class ListActiveSkillsController {
  constructor(private readonly listActiveSkills: ListActiveSkillsCatalogQuery) {}

  async handle({ request }: HttpContext) {
    const q = request.input('q') as unknown
    if (q !== undefined && typeof q !== 'string') {
      throw new ValidationException('Search query must be a string')
    }

    const skills = await this.listActiveSkills
      .executeAndWrap(typeof q === 'string' ? { q: q.trim() } : {})
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data(skills)
  }
}
