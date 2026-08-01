import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'

export default class ListProjectSkillsQuery {
  constructor(private readonly repository: ProjectSkillRepository) {}

  execute(projectId: string): Promise<ProjectSkillRecord[]> {
    return this.repository.listProjectSkills(projectId)
  }
}
