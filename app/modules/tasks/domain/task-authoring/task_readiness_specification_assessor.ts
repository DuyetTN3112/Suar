import {
  type FindingTarget,
  addFinding,
  isMeaningfulText,
} from './task_readiness_findings.js'

import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskSupportingReferenceV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export const SUPPORTED_RICH_CONTENT_NODE_TYPES = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'diagram',
  'doc',
  'document',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'listItem',
  'orderedList',
  'paragraph',
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
  'text',
])

export function findUnsupportedRichContentNode(
  value: TvaJsonValue,
  path = 'specification.richContent',
  isNode = true
): { type: string; path: string } | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Readonly<Record<string, TvaJsonValue>>
  const type = record['type']
  if (
    isNode &&
    typeof type === 'string' &&
    !SUPPORTED_RICH_CONTENT_NODE_TYPES.has(type)
  ) {
    return { type, path }
  }

  const content = record['content']
  if (!Array.isArray(content)) return null
  for (const [index, child] of content.entries()) {
    const unsupported = findUnsupportedRichContentNode(
      child as TvaJsonValue,
      `${path}.content.${index}`,
      true
    )
    if (unsupported) return unsupported
  }
  return null
}

export interface SpecificationAssessmentInput {
  readonly specification: {
    readonly richContent?: TvaJsonValue
    readonly plainText: string
    readonly sections: readonly {
      readonly id: string
      readonly plainText: string
      readonly critical: boolean
      readonly hasTextEquivalent: boolean
    }[]
  }
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
}

export function assessSpecification(
  input: SpecificationAssessmentInput,
  workBlockers: FindingTarget,
  warnings: FindingTarget
): void {
  const hasSelfContainedText =
    isMeaningfulText(input.specification.plainText) ||
    input.specification.sections.some((section) => isMeaningfulText(section.plainText))
  const hasSupportingReference = input.supportingReferences.length > 0
  const unsupportedNode = input.specification.richContent
    ? findUnsupportedRichContentNode(input.specification.richContent)
    : null

  if (unsupportedNode) {
    addFinding(warnings, {
      code: 'TVA.WORK.UNSUPPORTED_RICH_CONTENT_NODE',
      severity: 'warning',
      fieldPath: 'specification.richContent',
      sourcePath: unsupportedNode.path,
      message: `Rich-content node "${unsupportedNode.type}" is not supported by the resolved brief renderer.`,
      remediationHint:
        'Add a supported accessible representation and keep the plain-text projection complete.',
    })
  }

  if (!hasSelfContainedText) {
    addFinding(workBlockers, {
      code: hasSupportingReference
        ? 'TVA.WORK.LINK_ONLY_CORE_CONTENT'
        : 'TVA.WORK.SPECIFICATION_MISSING',
      fieldPath: 'specification.plainText',
      sourcePath: hasSupportingReference ? 'supportingReferences' : null,
      message: hasSupportingReference
        ? 'Supporting references do not replace self-contained task content.'
        : 'The task specification has no meaningful local content.',
      remediationHint:
        'Restate all execution-critical requirements in the Suar specification and confirm them.',
    })
  }

  const nonTextCriticalSection = input.specification.sections.find(
    (section) => section.critical && !section.hasTextEquivalent
  )
  if (nonTextCriticalSection) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.CRITICAL_NON_TEXT_WITHOUT_EQUIVALENT',
      fieldPath: 'specification.sections',
      sourcePath: `specification.sections.${nonTextCriticalSection.id}`,
      message: 'A critical image or diagram has no text equivalent.',
      remediationHint: 'Add an accessible caption, transcript, or structured textual summary.',
    })
  }

  const inaccessibleRequirementReference = input.supportingReferences.find(
    (reference) =>
      reference.relation === 'requirement_source' &&
      ['restricted', 'unavailable', 'unknown'].includes(reference.accessState)
  )
  if (inaccessibleRequirementReference) {
    addFinding(hasSelfContainedText ? warnings : workBlockers, {
      code: hasSelfContainedText
        ? 'TVA.REFERENCE.UNAVAILABLE_SUPPORTING_REFERENCE'
        : 'TVA.WORK.CRITICAL_REFERENCE_INACCESSIBLE',
      severity: hasSelfContainedText ? 'warning' : 'blocker',
      fieldPath: 'supportingReferences',
      sourcePath: `supportingReferences.${inaccessibleRequirementReference.id}`,
      message: hasSelfContainedText
        ? 'A supporting requirement source is currently inaccessible.'
        : 'Execution-critical information depends on an inaccessible reference.',
      remediationHint: hasSelfContainedText
        ? 'Restore access or replace the supporting reference.'
        : 'Bring the critical content into Suar and confirm that it is complete.',
    })
  }

  const authenticatedReference = input.supportingReferences.find(
    (reference) => reference.accessState === 'authenticated'
  )
  if (authenticatedReference) {
    addFinding(warnings, {
      code: 'TVA.REFERENCE.AUTHENTICATION_REQUIRED',
      severity: 'warning',
      fieldPath: 'supportingReferences',
      sourcePath: `supportingReferences.${authenticatedReference.id}`,
      message: 'A supporting reference requires external authentication.',
      remediationHint: 'Keep the Suar brief self-contained and verify access for intended readers.',
    })
  }
}
