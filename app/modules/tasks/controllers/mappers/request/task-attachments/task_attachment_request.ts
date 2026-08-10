import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { CreateTaskAttachmentDTO } from '#modules/tasks/actions/commands/task-attachments/create_task_attachment_command'

type TaskAttachmentRequest = Pick<HttpContext['request'], 'input'>

export type TaskAttachmentType = CreateTaskAttachmentDTO['attachment_type']

export interface TaskAttachmentUploadRequest {
  task_id: string
  temporary_path: string
  original_name: string
  file_size: number
  mime_type: string | null
  attachment_type: TaskAttachmentType
}

export type StoreTaskAttachmentRequest =
  | { readonly kind: 'create'; readonly input: CreateTaskAttachmentDTO }
  | { readonly kind: 'upload'; readonly input: TaskAttachmentUploadRequest }

const ATTACHMENT_TYPES = ['requirement', 'reference', 'submission', 'review', 'other'] as const
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024

function paramsRecord(params: unknown): Record<string, unknown> | undefined {
  return params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)
    : undefined
}

function readInput(request: TaskAttachmentRequest, camelCaseKey: string, snakeCaseKey?: string): unknown {
  const camelValue: unknown = request.input(camelCaseKey) as unknown
  if (camelValue !== undefined) return camelValue
  return snakeCaseKey === undefined ? undefined : (request.input(snakeCaseKey) as unknown)
}

function requiredRouteParam(params: unknown, name: string, issues: ValidationIssue[]): string | undefined {
  const value = paramsRecord(params)?.[name]
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'))
    return undefined
  }
  return value.trim()
}

function requiredString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  maxLength = 4096
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return undefined
  }
  return value.trim()
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    issues.push(validationIssue(path, `${path} must be a string or null`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  return value.trim() || null
}

function optionalFiniteNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const numberValue =
    typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    issues.push(validationIssue(path, `${path} must be a finite non-negative number`, 'REQUEST_NUMBER_INVALID'))
    return undefined
  }
  return numberValue
}

function parseAttachmentType(
  value: unknown,
  issues: ValidationIssue[]
): TaskAttachmentType {
  if (value === undefined) return 'other'
  if (typeof value !== 'string' || !ATTACHMENT_TYPES.includes(value as TaskAttachmentType)) {
    issues.push(validationIssue('attachmentType', 'attachmentType has an invalid value', 'REQUEST_ENUM_INVALID'))
    return 'other'
  }
  return value as TaskAttachmentType
}

function throwIfInvalid(issues: readonly ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

export function buildTaskAttachmentRouteRequest(params: unknown): { readonly taskId: string } {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  throwIfInvalid(issues)
  return { taskId: taskId as string }
}

export function buildTaskAttachmentMutationRouteRequest(params: unknown): {
  readonly taskId: string
  readonly attachmentId: string
} {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const attachmentId = requiredRouteParam(params, 'attachmentId', issues)
  throwIfInvalid(issues)
  return { taskId: taskId as string, attachmentId: attachmentId as string }
}

export function buildCreateTaskAttachmentRequest(
  request: TaskAttachmentRequest,
  params: unknown
): CreateTaskAttachmentDTO {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const fileName = requiredString(readInput(request, 'fileName', 'file_name'), 'fileName', issues, 500)
  const filePath = requiredString(readInput(request, 'filePath', 'file_path'), 'filePath', issues)
  const fileSize = optionalFiniteNumber(readInput(request, 'fileSize', 'file_size'), 'fileSize', issues)
  const mimeType = optionalString(readInput(request, 'mimeType', 'mime_type'), 'mimeType', issues)
  if (mimeType && mimeType.length > 255) {
    issues.push(validationIssue('mimeType', 'mimeType is too long', 'REQUEST_STRING_TOO_LONG'))
  }
  if (fileSize !== undefined && fileSize !== null && fileSize > MAX_ATTACHMENT_SIZE) {
    issues.push(validationIssue('fileSize', 'fileSize exceeds the upload limit', 'REQUEST_FILE_TOO_LARGE'))
  }
  const parsedAttachmentType = parseAttachmentType(
    readInput(request, 'attachmentType', 'attachment_type'),
    issues
  )
  throwIfInvalid(issues)
  return {
    task_id: taskId as string,
    file_name: fileName as string,
    file_path: filePath as string,
    ...(fileSize !== undefined ? { file_size: fileSize } : {}),
    ...(mimeType !== undefined ? { mime_type: mimeType } : {}),
    attachment_type: parsedAttachmentType,
  }
}

export interface TaskAttachmentUploadFile {
  isValid?: boolean
  tmpPath?: string | null
  clientName?: string
  size?: number
  type?: string
  subtype?: string
  headers?: Record<string, unknown>
}

export function buildUploadTaskAttachmentRequest(
  request: TaskAttachmentRequest,
  params: unknown,
  file: unknown
): TaskAttachmentUploadRequest {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const parsedAttachmentType = parseAttachmentType(
    readInput(request, 'attachmentType', 'attachment_type'),
    issues
  )
  const uploadedFile =
    file && typeof file === 'object' && !Array.isArray(file)
      ? (file as TaskAttachmentUploadFile)
      : undefined

  if (!uploadedFile) {
    issues.push(validationIssue('file', 'file is required', 'REQUEST_FILE_REQUIRED'))
  } else {
    if (uploadedFile.isValid !== true) {
      issues.push(validationIssue('file', 'file upload is invalid', 'REQUEST_FILE_INVALID'))
    }
    requiredString(uploadedFile.tmpPath, 'file.tmpPath', issues)
    requiredString(uploadedFile.clientName, 'file.clientName', issues)
    if (!Number.isFinite(uploadedFile.size) || (uploadedFile.size as number) < 0) {
      issues.push(validationIssue('file.size', 'file.size must be a finite non-negative number', 'REQUEST_NUMBER_INVALID'))
    }
    if (Number.isFinite(uploadedFile.size) && (uploadedFile.size as number) > MAX_ATTACHMENT_SIZE) {
      issues.push(validationIssue('file.size', 'file.size exceeds the upload limit', 'REQUEST_FILE_TOO_LARGE'))
    }
  }

  throwIfInvalid(issues)
  return {
    task_id: taskId as string,
    temporary_path: uploadedFile?.tmpPath?.trim() as string,
    original_name: uploadedFile?.clientName?.trim() as string,
    file_size: uploadedFile?.size as number,
    mime_type: uploadedFile ? taskAttachmentMimeType(uploadedFile) : null,
    attachment_type: parsedAttachmentType,
  }
}

export function buildStoreTaskAttachmentRequest(
  request: TaskAttachmentRequest,
  params: unknown,
  file: unknown
): StoreTaskAttachmentRequest {
  if (file === undefined || file === null) {
    return {
      kind: 'create',
      input: buildCreateTaskAttachmentRequest(request, params),
    }
  }

  return {
    kind: 'upload',
    input: buildUploadTaskAttachmentRequest(request, params, file),
  }
}

export function readAliasedTaskAttachmentString(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): string | undefined {
  const value: unknown = (request.input(camelCaseKey) ?? request.input(snakeCaseKey)) as unknown
  return typeof value === 'string' ? value : undefined
}

export function readAliasedTaskAttachmentNumber(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): number | null | undefined {
  const value: unknown = (request.input(camelCaseKey) ?? request.input(snakeCaseKey)) as unknown
  if (value === null) return null
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined
}

export function taskAttachmentMimeType(file: {
  type?: string
  subtype?: string
  headers?: Record<string, unknown>
}): string | null {
  const header = file.headers?.['content-type']
  if (typeof header === 'string' && header.trim()) return header.trim()
  if (file.type?.trim() && file.subtype?.trim()) return `${file.type.trim()}/${file.subtype.trim()}`
  return null
}
