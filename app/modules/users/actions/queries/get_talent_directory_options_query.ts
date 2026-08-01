import type {
  UserTalentDirectoryOptionsReader,
  UserTalentDirectorySkillOption,
  UserTalentDirectoryTaskOption,
} from '#modules/users/actions/ports/outbound/user_talent_directory_options_reader'

export interface TalentDirectoryOptionsResult {
  availableSkills: UserTalentDirectorySkillOption[]
  availableTasks: UserTalentDirectoryTaskOption[]
}

export default class GetTalentDirectoryOptionsQuery {
  constructor(private readonly options: UserTalentDirectoryOptionsReader) {}

  async execute(organizationId: string): Promise<TalentDirectoryOptionsResult> {
    const [availableSkills, availableTasks] = await Promise.all([
      this.options.listActiveSkills(),
      this.options.listRootTasks(organizationId),
    ])

    return { availableSkills, availableTasks }
  }
}
