import { test } from '@japa/runner'

import { userProfileActionFactory } from '#composition/users/user-factories/user_action_factory'
import AddUserSkillCommand from '#modules/users/actions/commands/profile-skills/add_user_skill_command'
import PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/profile/publish_user_profile_snapshot_command'
import RemoveUserSkillCommand from '#modules/users/actions/commands/profile-skills/remove_user_skill_command'
import UpdateUserSkillCommand from '#modules/users/actions/commands/profile-skills/update_user_skill_command'
import GetProfileEditPageQuery from '#modules/users/actions/queries/profile/get_profile_edit_page_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

test('User profile action factory creates fresh context-bound use cases', ({ assert }) => {
  const context = makeSystemUserActionContext('user-1')
  const first = userProfileActionFactory.makeEditPage(context)
  const second = userProfileActionFactory.makeEditPage(context)

  assert.instanceOf(first, GetProfileEditPageQuery)
  assert.notStrictEqual(first, second)
  assert.instanceOf(userProfileActionFactory.makeAddSkill(context), AddUserSkillCommand)
  assert.instanceOf(userProfileActionFactory.makeRemoveSkill(context), RemoveUserSkillCommand)
  assert.instanceOf(userProfileActionFactory.makeUpdateSkill(context), UpdateUserSkillCommand)
  assert.instanceOf(
    userProfileActionFactory.makePublishSnapshot(context),
    PublishUserProfileSnapshotCommand
  )
})
