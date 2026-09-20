import type { TaskBriefV2 } from '@/apps/shared/tasks/task_brief_contract'
import {
  isMeaningfulTaskCreateText,
  type TaskCreateTranslate,
  type TaskCreateValidationErrors,
} from '@/apps/shared/tasks/task_create_validation'

function translated(
  t: TaskCreateTranslate,
  key: string,
  fallback: string,
  params: Record<string, unknown> = {}
): string {
  return t(key, params, fallback)
}

export function validateTaskCreateBrief(
  brief: TaskBriefV2,
  errors: TaskCreateValidationErrors,
  t: TaskCreateTranslate
): void {
  const hasCompleteWorkItem = brief.workItems.some((item) =>
    isMeaningfulTaskCreateText(item.affectedArea) &&
    isMeaningfulTaskCreateText(item.requiredChange) &&
    isMeaningfulTaskCreateText(item.resultingBehaviour)
  )
  const hasIncompleteWorkItem = brief.workItems.some((item) => {
    const values = [item.affectedArea, item.requiredChange, item.resultingBehaviour]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteWorkItem) {
    errors.brief_work_items = translated(
      t,
      'task.validation.work_items_incomplete',
      'Hoàn thiện hoặc xóa từng hạng mục công việc đang điền dở'
    )
  } else if (!hasCompleteWorkItem) {
    errors.brief_work_items = translated(
      t,
      'task.validation.work_items_required',
      'Thêm ít nhất một hạng mục có phần bị tác động, thay đổi và hành vi sau thay đổi'
    )
  }

  if (![
    brief.currentState,
    brief.currentStateSituation,
    brief.affectedParties,
    brief.impactIfUnresolved,
  ].every(isMeaningfulTaskCreateText)) {
    errors.brief_current_state = translated(
      t,
      'task.validation.current_state_required',
      'Làm rõ hiện trạng, nơi xảy ra, phần bị ảnh hưởng và hậu quả nếu chưa xử lý'
    )
  }

  if (!brief.scope.some((item) => isMeaningfulTaskCreateText(item.text))) {
    errors.brief_scope = translated(
      t,
      'task.validation.scope_required',
      'Nêu ít nhất một phần hoặc hành vi nằm trong Task'
    )
  }

  const hasIncompleteRequiredDetail = [
    brief.outOfScope.length === 0 ||
      !brief.outOfScope.some((item) => isMeaningfulTaskCreateText(item.text)),
    brief.businessRules.some((item) => {
      const values = [item.actor, item.condition, item.permission, item.systemResult]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    brief.businessRules.length === 0 ||
      !brief.businessRules.some((item) =>
        [item.actor, item.condition, item.permission, item.systemResult].every(isMeaningfulTaskCreateText)
      ),
    brief.constraints.length === 0 ||
      !brief.constraints.some((item) => isMeaningfulTaskCreateText(item.text)),
    brief.dependencies.some((item) => {
      const values = [item.dependency, item.owner]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    brief.dependencies.length === 0 ||
      !brief.dependencies.some((item) =>
        [item.dependency, item.owner].every(isMeaningfulTaskCreateText)
      ),
  ].some(Boolean)
  const hasIncompleteRequiredQuality =
    brief.qualityRequirements.length === 0 ||
    !brief.qualityRequirements.some((item) =>
      [item.property, item.appliesTo, item.observableCheck].every(isMeaningfulTaskCreateText)
    )
  const hasIncompleteRequiredDesiredValue =
    !brief.desiredValue ||
    ![
      brief.desiredValue.beneficiary,
      brief.desiredValue.usefulState,
    ].every(isMeaningfulTaskCreateText)
  const hasIncompleteOptionalDetail = [
    hasIncompleteRequiredQuality,
    hasIncompleteRequiredDesiredValue,
    brief.qualityRequirements.some((item) => {
      const values = [item.property, item.appliesTo, item.observableCheck]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    Boolean(
      brief.desiredValue &&
        [brief.desiredValue.beneficiary, brief.desiredValue.usefulState]
          .some(isMeaningfulTaskCreateText) &&
        ![brief.desiredValue.beneficiary, brief.desiredValue.usefulState]
          .every(isMeaningfulTaskCreateText)
    ),
  ].some(Boolean)
  if (hasIncompleteRequiredDetail || hasIncompleteOptionalDetail) {
    errors.brief_optional_details = translated(
      t,
      'task.validation.required_details_incomplete',
      'Hoàn thiện yêu cầu chất lượng, giá trị mong muốn và các mục ngoài phạm vi, quy tắc, giới hạn, phụ thuộc bắt buộc'
    )
  }

  const hasCompleteDeliverable = brief.deliverables.some((item) =>
    isMeaningfulTaskCreateText(item.outputType) &&
    isMeaningfulTaskCreateText(item.locationOrRecipient) &&
    isMeaningfulTaskCreateText(item.minimumState)
  )
  const hasIncompleteDeliverable = brief.deliverables.some((item) => {
    const values = [item.outputType, item.locationOrRecipient, item.minimumState]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteDeliverable) {
    errors.brief_deliverables = translated(
      t,
      'task.validation.deliverables_incomplete',
      'Hoàn thiện hoặc xóa từng đầu ra đang điền dở'
    )
  } else if (!hasCompleteDeliverable) {
    errors.brief_deliverables = translated(
      t,
      'task.validation.deliverables_required',
      'Thêm ít nhất một đầu ra có loại, vị trí/đối tượng và trạng thái tối thiểu'
    )
  }

  const hasCompleteAcceptance = brief.acceptanceCriteria.some((item) =>
    isMeaningfulTaskCreateText(item.condition) &&
    isMeaningfulTaskCreateText(item.action) &&
    isMeaningfulTaskCreateText(item.observableResult)
  )
  const hasIncompleteAcceptance = brief.acceptanceCriteria.some((item) => {
    const values = [item.condition, item.action, item.observableResult]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteAcceptance) {
    errors.brief_acceptance = translated(
      t,
      'task.validation.acceptance_incomplete',
      'Hoàn thiện hoặc xóa từng tiêu chí nghiệm thu đang điền dở'
    )
  } else if (!hasCompleteAcceptance) {
    errors.brief_acceptance = translated(
      t,
      'task.validation.acceptance_required',
      'Thêm ít nhất một tiêu chí có điều kiện, hành động và kết quả quan sát được'
    )
  }
}
