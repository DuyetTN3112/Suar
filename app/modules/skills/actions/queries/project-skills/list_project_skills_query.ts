import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'

export default class ListProjectSkillsQuery extends BaseQuery<
  { readonly projectId: string },
  ProjectSkillRecord[]
> {
  constructor(private readonly repository: ProjectSkillRepository) {
    super()
  }

  async handle(input: { readonly projectId: string }): Promise<ProjectSkillRecord[]> {
    return this.repository.listProjectSkills(input.projectId)
  }

  execute(projectId: string): Promise<ProjectSkillRecord[]> {
    return this.handle({ projectId })
  }
}
