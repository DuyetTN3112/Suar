import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'
import * as taskListQueries from '#modules/tasks/infra/repositories/task-reading/read/list_queries'
import type {
  UserTalentDirectoryOptionsReader,
  UserTalentDirectorySkillOption,
  UserTalentDirectoryTaskOption,
} from '#modules/users/actions/ports/outbound/user_talent_directory_options_reader'

export class UserTalentDirectoryOptionsReaderAdapter
  implements UserTalentDirectoryOptionsReader
{
  async listActiveSkills(): Promise<UserTalentDirectorySkillOption[]> {
    return skillPublicApi.listActive()
  }

  async listRootTasks(
    organizationId: string
  ): Promise<UserTalentDirectoryTaskOption[]> {
    const tasks = await taskListQueries.findRootTasksByOrganization(
      organizationId,
      100
    )
    return tasks.map((task) => ({ id: task.id, title: task.title }))
  }
}
