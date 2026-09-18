import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
} from '#tests/helpers/factories'

async function createAttachmentsScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: owner.id,
    title: 'Task attachments contract task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: owner.id,
    assigned_by: owner.id,
    assignment_status: 'active',
  })

  return { owner, task, assignment }
}

test.group('Contract | Task attachments API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('task attachments endpoints accept camelCase input and return wrapped camelCase collection', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createAttachmentsScenario()

    const createResponse = await client
      .post(`/api/tasks/${task.id}/attachments`)
      .loginAs(owner)
      .json({
        fileName: 'design-doc.pdf',
        filePath: 'https://example.com/design-doc.pdf',
        fileSize: 4096,
        mimeType: 'application/pdf',
        attachmentType: 'reference',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
        createdAt: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.fileName, 'design-doc.pdf')
    assert.equal(createBody.data.filePath, 'https://example.com/design-doc.pdf')
    assert.equal(createBody.data.fileSize, 4096)
    assert.equal(createBody.data.mimeType, 'application/pdf')
    assert.equal(createBody.data.attachmentType, 'reference')
    assert.equal(createBody.data.uploadedBy, owner.id)
    assert.notProperty(createBody.data, 'file_name')
    assert.notProperty(createBody.data, 'uploaded_by')

    const listResponse = await client.get(`/api/tasks/${task.id}/attachments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
        uploadedByUsername: string | null
        createdAt: string
      }[]
    }

    assert.notProperty(listBody, 'success')
    assert.isArray(listBody.data)
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      fileName: 'design-doc.pdf',
      filePath: 'https://example.com/design-doc.pdf',
      attachmentType: 'reference',
      uploadedBy: owner.id,
    })
    assert.notProperty(listBody.data[0] ?? {}, 'file_name')
    assert.notProperty(listBody.data[0] ?? {}, 'attachment_type')
    assert.notProperty(listBody.data[0] ?? {}, 'uploaded_by')
  })

  test('canonical v1 task attachments endpoints preserve wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createAttachmentsScenario()

    const createResponse = await client
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .loginAs(owner)
      .json({
        fileName: 'design-doc-v1.pdf',
        filePath: 'https://example.com/design-doc-v1.pdf',
        fileSize: 8192,
        mimeType: 'application/pdf',
        attachmentType: 'reference',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.fileName, 'design-doc-v1.pdf')
    assert.equal(createBody.data.filePath, 'https://example.com/design-doc-v1.pdf')
    assert.equal(createBody.data.fileSize, 8192)
    assert.equal(createBody.data.mimeType, 'application/pdf')
    assert.equal(createBody.data.attachmentType, 'reference')
    assert.equal(createBody.data.uploadedBy, owner.id)

    const listResponse = await client.get(`/api/v1/tasks/${task.id}/attachments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        taskId: string
        fileName: string
        filePath: string
        attachmentType: string
        uploadedBy: string
      }>
    }

    assert.notProperty(listBody, 'success')
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      fileName: 'design-doc-v1.pdf',
      filePath: 'https://example.com/design-doc-v1.pdf',
      attachmentType: 'reference',
      uploadedBy: owner.id,
    })

    const attachmentId = createBody.data.id
    const deleteResponse = await client
      .delete(`/api/v1/tasks/${task.id}/attachments/${attachmentId}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)
  })
})
