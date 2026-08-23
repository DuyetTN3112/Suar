import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCreateTaskAttachmentRequest,
  buildStoreTaskAttachmentRequest,
  buildTaskAttachmentMutationRouteRequest,
  buildUploadTaskAttachmentRequest,
  taskAttachmentMimeType,
} from '#modules/tasks/controllers/mappers/request/task-attachments/task_attachment_request'

function requestFrom(input: Record<string, unknown>) {
  return { input: (key: string) => input[key] }
}


test.group('', () => {
  test('maps valid JSON attachment metadata and aliases', ({ assert }) => {
    assert.deepEqual(
      buildCreateTaskAttachmentRequest(
        requestFrom({
          file_name: 'design.pdf',
          filePath: ' https://example.test/design.pdf ',
          fileSize: '1024',
          mimeType: ' application/pdf ',
          attachment_type: 'reference',
        }),
        { taskId: ' task-1 ' }
      ),
      {
        task_id: 'task-1',
        file_name: 'design.pdf',
        file_path: 'https://example.test/design.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        attachment_type: 'reference',
      }
    )
  })

  test('rejects malformed route, enum, required fields, and non-finite size', ({ assert }) => {
    assert.throws(
      () =>
        buildCreateTaskAttachmentRequest(
          requestFrom({ fileName: 42, filePath: '', fileSize: Number.NaN, attachmentType: 'malware' }),
          { taskId: 42 }
        ),
      ValidationException
    )
    assert.throws(
      () => buildTaskAttachmentMutationRouteRequest({ taskId: 'task-1', attachmentId: null }),
      ValidationException
    )
  })

  test('validates uploaded file metadata and derives a safe MIME type', ({ assert }) => {
    const mapped = buildUploadTaskAttachmentRequest(
      requestFrom({ attachmentType: 'submission' }),
      { taskId: 'task-1' },
      {
        isValid: true,
        tmpPath: ' /tmp/upload ',
        clientName: 'evidence.zip',
        size: 4096,
        headers: { 'content-type': 'application/zip' },
      }
    )
    assert.deepEqual(mapped, {
      task_id: 'task-1',
      temporary_path: '/tmp/upload',
      original_name: 'evidence.zip',
      file_size: 4096,
      mime_type: 'application/zip',
      attachment_type: 'submission',
    })
    assert.equal(taskAttachmentMimeType({ type: 'image', subtype: 'png' }), 'image/png')
    assert.throws(
      () =>
        buildUploadTaskAttachmentRequest(
          requestFrom({ attachmentType: 'other' }),
          { taskId: 'task-1' },
          { isValid: false, tmpPath: '/tmp/upload', clientName: 'bad.bin', size: Infinity }
        ),
      ValidationException
    )
  })

  test('preserves the transport variant for one store application intent', ({ assert }) => {
    const upload = buildStoreTaskAttachmentRequest(
      requestFrom({ attachmentType: 'reference' }),
      { taskId: 'task-1' },
      { isValid: true, tmpPath: '/tmp/upload', clientName: 'evidence.zip', size: 10 }
    )
    const create = buildStoreTaskAttachmentRequest(
      requestFrom({ fileName: 'design.pdf', filePath: '/files/design.pdf' }),
      { taskId: 'task-1' },
      undefined
    )

    assert.equal(upload.kind, 'upload')
    assert.equal(create.kind, 'create')
  })


})
