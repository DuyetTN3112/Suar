import { describe, expect, it } from 'vitest'

import { createEmptyTaskBrief } from '@/apps/shared/tasks/task_brief_contract'
import {
  getFirstTaskCreateErrorField,
  getTaskCreateTabErrorCounts,
  validateTaskCreate,
  type TaskCreateValidationData,
} from '@/apps/shared/tasks/task_create_validation'

const t = (_key: string, _params: Record<string, unknown>, fallback: string) => fallback

function validFormData(): TaskCreateValidationData {
  const brief = createEmptyTaskBrief()
  brief.workItems = [{ id: 'work-1', affectedArea: 'Tạo Task', requiredChange: 'Chuẩn hóa form', resultingBehaviour: 'Người tạo điền được contract rõ ràng' }]
  brief.currentState = 'Form hiện tại có các ô quá chung chung.'
  brief.currentStateSituation = 'Khi người dùng tạo Task trên Board Project.'
  brief.affectedParties = 'Người nhận Task và reviewer.'
  brief.impactIfUnresolved = 'Công việc và nghiệm thu vẫn bị mơ hồ.'
  brief.scope = [{ id: 'scope-1', text: 'Form tạo Task' }]
  brief.outOfScope = [{ id: 'out-of-scope-1', text: 'Không thay đổi policy phân quyền chung' }]
  brief.businessRules = [{ id: 'rule-1', actor: 'Người nhận', condition: 'Có quyền', permission: 'Được thao tác', systemResult: 'Hệ thống ghi nhận thay đổi' }]
  brief.constraints = [{ id: 'constraint-1', text: 'Không phá vỡ API hiện có' }]
  brief.dependencies = [{ id: 'dependency-1', dependency: 'API người dùng', owner: 'Nhóm nền tảng', state: 'available' }]
  brief.deliverables = [{ id: 'deliverable-1', outputType: 'Giao diện', locationOrRecipient: 'Form tạo Task', minimumState: 'Có các mục contract cụ thể' }]
  brief.acceptanceCriteria = [{ id: 'acceptance-1', condition: 'Người tạo mở form', action: 'Điền một hạng mục', observableResult: 'Có phần bị tác động, thay đổi và hành vi' }]
  brief.qualityRequirements = [{ id: 'quality-1', property: 'An toàn phân quyền', appliesTo: 'API lịch sử Task', observableCheck: 'Người không có quyền không nhận dữ liệu' }]
  brief.desiredValue = { beneficiary: 'Thành viên project', usefulState: 'Xem được lịch sử Task đúng quyền và không lộ dữ liệu' }
  return {
    title: 'Chuẩn hóa form tạo Task', description: '', task_status_id: 'todo', project_id: 'project-1', priority: 'high', label: 'backend',
    estimated_time: '2', due_date: '2099-01-02', assigned_to: 'assignee-1', brief,
    required_skills: [{ id: 'skill-1', name: 'Thiết kế API', rubric_version_id: 'rubric-version-1', assessment_ceiling_level_id: 'level-10' }],
    verification_method: 'code_review', reviewer_user_id: 'reviewer-1', authoring_mode: 'evidence_enabled', creator_confirmed: true,
  }
}

describe('task create validation', () => {
  it('allows an incomplete draft with only base identity fields', () => {
    const formData = validFormData()
    formData.assigned_to = ''
    formData.required_skills = []
    formData.brief = createEmptyTaskBrief()
    expect(validateTaskCreate(formData, 'save_draft', t)).toEqual({})
  })

  it('returns only meaningful contract blockers for publish', () => {
    const formData = validFormData()
    formData.assigned_to = ''
    formData.priority = ''
    formData.label = ''
    formData.required_skills = []
    formData.verification_method = ''
    formData.reviewer_user_id = ''
    formData.creator_confirmed = false
    formData.brief = createEmptyTaskBrief()

    const errors = validateTaskCreate(formData, 'publish', t)
    expect(Object.keys(errors)).toEqual([
      'priority', 'label', 'brief_work_items', 'brief_current_state', 'brief_scope',
      'brief_optional_details',
      'brief_deliverables', 'brief_acceptance', 'required_skills',
      'verification_method', 'creator_confirmed',
    ])
    expect(getTaskCreateTabErrorCounts(errors as Record<string, string>)).toEqual({ setup: 4, skills: 1, assignment: 0, planning: 2, contract: 4 })
    expect(getFirstTaskCreateErrorField(errors as Record<string, string>)).toBe('priority')
  })

  it('accepts the mandatory out-of-scope, rules, constraints, and dependencies when complete', () => {
    expect(validateTaskCreate(validFormData(), 'publish', t)).toEqual({})
  })

  it('requires a due date when publishing an operational Task', () => {
    const formData = validFormData()
    formData.due_date = ''

    expect(validateTaskCreate(formData, 'publish', t).due_date).toMatch(/ngày hết hạn/i)
  })

  it('requires a mandatory structured item to be complete once its creator starts it', () => {
    const formData = validFormData()
    formData.brief.businessRules = [{
      id: 'rule-1', actor: 'Người xem Task', condition: '', permission: '', systemResult: '',
    }]

    const errors = validateTaskCreate(formData, 'publish', t)

    expect(errors.brief_optional_details).toMatch(/Hoàn thiện/i)
  })

  it('rejects placeholders, self-review, and incomplete structured contract values', () => {
    const formData = validFormData()
    formData.title = 'todo'
    formData.reviewer_user_id = formData.assigned_to
    formData.required_skills[0] = { id: 'skill-1', name: 'Thiết kế API', rubric_version_id: null, assessment_ceiling_level_id: null }
    formData.brief.acceptanceCriteria[0].observableResult = 'TBD'

    const errors = validateTaskCreate(formData, 'publish', t)
    expect(errors.title).toMatch(/specific title/i)
    expect(errors.brief_acceptance).toMatch(/Hoàn thiện hoặc xóa/i)
    expect(errors.reviewer_user_id).toMatch(/different from the assignee/i)
    expect(errors.required_skills).toMatch(/rubric/i)
  })

  it('requires only title and content or link for a Docs item', () => {
    const formData = validFormData()
    formData.is_documentation_item = true
    formData.title = 'Hướng dẫn triển khai'
    formData.description = ''
    expect(validateTaskCreate(formData, 'save_draft', t)).toEqual({ description: 'Add the document content or a link to it' })
    formData.description = 'https://example.test/docs/deployment'
    expect(validateTaskCreate(formData, 'save_draft', t)).toEqual({})
  })
})
