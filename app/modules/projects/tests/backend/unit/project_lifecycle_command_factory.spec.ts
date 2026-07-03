import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import CreateProjectCommand from '#modules/projects/actions/commands/project-context/create_project_command'
import DeleteProjectCommand from '#modules/projects/actions/commands/project-context/delete_project_command'
import UpdateProjectCommand from '#modules/projects/actions/commands/project-context/update_project_command'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'

test('Project lifecycle command factory resolves and creates fresh use cases', async ({
  assert,
}) => {
  type FactoryConstructor = new () => ProjectLifecycleCommandFactory
  const factoryToken = ProjectLifecycleCommandFactory as unknown as FactoryConstructor
  const factory = await app.container.make(factoryToken)
  const context = makeSystemProjectActionContext('user-1')

  assert.instanceOf(factory, factoryToken)
  assert.instanceOf(factory.makeCreate(context), CreateProjectCommand)
  assert.instanceOf(factory.makeUpdate(context), UpdateProjectCommand)
  assert.instanceOf(factory.makeDelete(context), DeleteProjectCommand)
  assert.notStrictEqual(factory.makeCreate(context), factory.makeCreate(context))
})
