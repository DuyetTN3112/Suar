import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import CreateTaskAttachmentCommand from '#modules/tasks/actions/commands/create_task_attachment_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task attachments validation', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('invalid attachment size and type are rejected without attachment rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Attachment validation task',
    })
    const command = new CreateTaskAttachmentCommand(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps
    )

    await assert.rejects(
      () =>
        command.execute({
          task_id: task.id,
          file_name: 'bad-size.pdf',
          file_path: 'https://example.com/bad-size.pdf',
          file_size: -1,
          mime_type: 'application/pdf',
          attachment_type: 'reference',
        }),
      ValidationException,
      'Task attachment file size cannot be negative'
    )

    await assert.rejects(
      () =>
        command.execute({
          task_id: task.id,
          file_name: 'bad-type.pdf',
          file_path: 'https://example.com/bad-type.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          attachment_type: 'malware' as never,
        }),
      ValidationException,
      'Task attachment type is invalid'
    )

    const attachments = (await db
      .from('task_attachments')
      .where('task_id', task.id)
      .whereNull('deleted_at')
      .count('* as total')
      .first()) as { total: number | string } | null

    assert.equal(Number(attachments?.total ?? 0), 0)
  })
})
