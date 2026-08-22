import { BaseQuery } from '#modules/users/actions/base_query'
import type {
  UserTalentDirectoryOptionsReader,
  UserTalentDirectorySkillOption,
  UserTalentDirectoryTaskOption,
} from '#modules/users/actions/ports/outbound/user_talent_directory_options_reader'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

export interface TalentDirectoryOptionsResult {
  availableSkills: UserTalentDirectorySkillOption[]
  availableTasks: UserTalentDirectoryTaskOption[]
}

interface GetTalentDirectoryOptionsInput {
  readonly organizationId: string
}

export default class GetTalentDirectoryOptionsQuery extends BaseQuery<
  GetTalentDirectoryOptionsInput,
  TalentDirectoryOptionsResult
> {
  constructor(private readonly options: UserTalentDirectoryOptionsReader) {
    super(makeSystemUserActionContext('system'))
  }

  override async handle({ organizationId }: GetTalentDirectoryOptionsInput): Promise<TalentDirectoryOptionsResult> {
    const [availableSkills, availableTasks] = await Promise.all([
      this.options.listActiveSkills(),
      this.options.listRootTasks(organizationId),
    ])

    return { availableSkills, availableTasks }
  }

  /** Backward-compatible adapter for existing composition callers. */
  async execute(organizationId: string): Promise<TalentDirectoryOptionsResult> {
    return this.handle({ organizationId })
  }
}
