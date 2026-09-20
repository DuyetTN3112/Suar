import { Bot, FileSearch, Gavel, Scale } from 'lucide-svelte'

import {
  isRecord,
  type AnalysisBlock,
  type AssessedDifficulty,
  type CapabilityProposal,
  type ComplexityAssessment,
  type DebateTraceEntry,
  type ProfileAssessmentStatus,
} from './dispute_verdict_parser.js'

export * from './dispute_verdict_parser.js'

export function debateStage(entry: DebateTraceEntry): {
  label: string
  actor: string
  description: string
  Icon: typeof FileSearch
} {
  if (entry.presentation?.title && entry.presentation.actor) {
    return {
      label: entry.presentation.title,
      actor: entry.presentation.actor,
      description: entry.presentation.purpose ?? 'Phân tích theo vai trò đã chọn trong template Suar.',
      Icon: entry.type === 'decision' ? Gavel : Bot,
    }
  }
  if (entry.roleId === 'neutral_mediator' || entry.type === 'decision') {
    return {
      label: 'Kết luận trung lập',
      actor: 'AI điều phối phiên',
      description: 'Đối chiếu các lập luận và đề xuất hướng xử lý.',
      Icon: Gavel,
    }
  }
  if (
    entry.roleId === 'evidence_analyst' ||
    entry.fromRole === 'Evidence Analyst' ||
    entry.fromRole === 'Chuyên viên Phân tích Bằng chứng'
  ) {
    return {
      label: 'Đối chiếu chứng cứ',
      actor: 'AI phân tích chứng cứ',
      description: 'Tách dữ kiện, mâu thuẫn và phần còn thiếu.',
      Icon: FileSearch,
    }
  }
  if (
    entry.roleId === 'claimant_advocate' ||
    entry.fromRole === 'Claimant Advocate' ||
    entry.fromRole === 'Đại diện Người khiếu nại'
  ) {
    return {
      label: 'Góc nhìn người khiếu nại',
      actor: 'AI đại diện người khiếu nại',
      description: 'Lập luận ủng hộ yêu cầu tranh chấp.',
      Icon: Bot,
    }
  }
  if (
    entry.roleId === 'respondent_advocate' ||
    entry.fromRole === 'Respondent Advocate' ||
    entry.fromRole === 'Đại diện Người bị khiếu nại'
  ) {
    return {
      label: 'Góc nhìn bên được phản hồi',
      actor: 'AI đại diện bên được phản hồi',
      description: 'Lập luận bảo vệ đánh giá ban đầu.',
      Icon: Scale,
    }
  }
  return {
    label: 'Phân tích nghiệp vụ',
    actor: 'AI phân tích hồ sơ',
    description: 'Bổ sung căn cứ cho phiên phân xử.',
    Icon: Bot,
  }
}

export function readableContent(entry: DebateTraceEntry): string {
  return entry.evidence ?? entry.summary ?? 'Không có nội dung.'
}

export function debatePreview(entry: DebateTraceEntry): string {
  if (entry.presentation?.summary) return entry.presentation.summary
  const content = readableContent(entry)
  const firstUsefulLine = content
    .replace(/```(?:json)?/gi, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '').trim())
    .find((line) => line.length > 0 && line !== '---')

  if (!firstUsefulLine || firstUsefulLine === '{') return 'Đã ghi nhận lập luận chi tiết trong hồ sơ phiên.'
  return firstUsefulLine.length > 180 ? `${firstUsefulLine.slice(0, 177)}…` : firstUsefulLine
}

export function jsonFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    recommendation: 'Đề xuất',
    verdict: 'Kết luận',
    rationale: 'Lập luận',
    evidence_summary: 'Tóm tắt chứng cứ',
    score_or_review_delta: 'Điều chỉnh đề xuất',
    action_items: 'Việc cần thực hiện',
    unknowns_or_missing_evidence: 'Điểm còn thiếu',
    confidence: 'Độ tin cậy',
    summary: 'Tóm tắt',
    findings: 'Các nhận định',
    claim: 'Nhận định',
    evidence_refs: 'Dẫn chiếu chứng cứ',
    assessment: 'Đánh giá',
    certainty: 'Mức độ chắc chắn',
    unknowns: 'Điểm chưa xác định',
    compensation: 'Khắc phục',
    requested_outcome: 'Yêu cầu xử lý',
  }
  return labels[key] ?? key.replace(/_/g, ' ')
}

export function auditContextLabel(value: string): string {
  const labels: Record<string, string> = {
    task_contract: 'Hợp đồng công việc',
    system_record: 'Trạng thái và mốc thời gian hệ thống',
    task_review_messages: 'Review và phản hồi trong workflow',
    dispute_claim: 'Nội dung report tranh chấp',
    organization_project_scope: 'Ngữ cảnh tổ chức và dự án',
    evidence_packet: 'Hồ sơ dữ kiện đã đối chiếu',
    core_role_analyses: 'Phân tích của hội đồng lõi',
    specialist_analysis: 'Ý kiến chuyên gia được route',
  }
  return labels[value] ?? value
}

export function jsonValue(label: string | undefined, value: unknown): string {
  if (label === 'Đề xuất' && typeof value === 'string') {
    return {
      uphold_review: 'Giữ nguyên đánh giá',
      adjust_score: 'Điều chỉnh điểm',
      request_re_review: 'Yêu cầu đánh giá lại',
      dismiss_dispute: 'Bác bỏ tranh chấp',
      partially_accept: 'Chấp nhận một phần',
    }[value] ?? value
  }
  if (label === 'Độ tin cậy' && typeof value === 'number') return `${Math.round(value * 100)}%`
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (value === null || value === undefined) return 'Không có'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export function addJsonBlocks(value: unknown, blocks: AnalysisBlock[], label?: string): void {
  if (Array.isArray(value)) {
    if (label) blocks.push({ kind: 'heading', text: label })
    for (const item of value) {
      if (isRecord(item) || Array.isArray(item)) addJsonBlocks(item, blocks)
      else blocks.push({ kind: 'bullet', text: String(item) })
    }
    return
  }
  if (isRecord(value)) {
    if (label) blocks.push({ kind: 'heading', text: label })
    for (const [key, item] of Object.entries(value)) {
      addJsonBlocks(item, blocks, jsonFieldLabel(key))
    }
    return
  }
  blocks.push({ kind: 'detail', label, text: jsonValue(label, value) })
}

export function addMarkdownBlocks(value: string, blocks: AnalysisBlock[]): void {
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine
      .replace(/^\s*[-*]\s+/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim()
    if (!line || line === '---') continue
    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      blocks.push({ kind: 'heading', text: heading[1] ?? '' })
      continue
    }
    if (/^(?:[-*]|\d+\.)\s+/.test(rawLine.trim())) {
      blocks.push({ kind: 'bullet', text: line })
      continue
    }
    blocks.push({ kind: 'paragraph', text: line })
  }
}

export function analysisBlocks(value: string): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = []
  const fencedJson = /```(?:json)?\s*([\s\S]*?)```/gi
  let cursor = 0
  for (const match of value.matchAll(fencedJson)) {
    addMarkdownBlocks(value.slice(cursor, match.index), blocks)
    const fencedContent = match[1] ?? ''
    try {
      addJsonBlocks(JSON.parse(fencedContent), blocks)
    } catch {
      addMarkdownBlocks(fencedContent, blocks)
    }
    cursor = match.index + match[0].length
  }
  addMarkdownBlocks(value.slice(cursor), blocks)
  return blocks.length > 0 ? blocks : [{ kind: 'paragraph', text: 'Không có nội dung.' }]
}

export function traceBlocks(entry: DebateTraceEntry): AnalysisBlock[] {
  if (entry.presentation) {
    const blocks: AnalysisBlock[] = []
    addJsonBlocks(
      {
        summary: entry.presentation.summary,
        findings: entry.presentation.findings,
        unknowns: entry.presentation.unknowns,
        confidence: entry.presentation.confidence,
      },
      blocks
    )
    return blocks
  }
  return analysisBlocks(readableContent(entry))
}

export function decisionLabel(
  value: string | null,
  t: (key: string, values?: Record<string, unknown>, fallback?: string) => string
): string {
  const labels: Record<string, string> = {
    uphold_review: 'Giữ nguyên đánh giá',
    adjust_score: 'Điều chỉnh điểm',
    request_re_review: 'Yêu cầu đánh giá lại',
    dismiss_dispute: 'Bác bỏ tranh chấp',
    partially_accept: 'Chấp nhận một phần',
  }
  return value ? t(`task.disputes.admin_detail.resolve.form.decisions.${value}`, {}, labels[value] ?? value) : 'Chưa có đề xuất'
}

export function difficultyLabel(value: AssessedDifficulty | null): string {
  const labels: Record<AssessedDifficulty, string> = {
    easy: 'Dễ',
    medium: 'Trung bình',
    hard: 'Khó',
    expert: 'Chuyên gia',
    unknown: 'Chưa đủ dữ kiện',
  }
  return value ? labels[value] : 'Chưa đánh giá'
}

export function complexityStatusLabel(value: ComplexityAssessment['status']): string {
  return {
    supported: 'Phù hợp với nhãn ban đầu',
    adjusted: 'Cần điều chỉnh nhãn ban đầu',
    insufficient_evidence: 'Chưa đủ chứng cứ để xếp mức',
  }[value]
}

export function profileAssessmentStatusLabel(value: ProfileAssessmentStatus): string {
  return {
    not_eligible_by_contract: 'Công việc chưa được khai báo để tác động hồ sơ',
    proposal_ready: 'Có đề xuất năng lực — chờ quản trị viên phê duyệt',
    insufficient_evidence: 'Chưa đủ căn cứ để đề xuất profile',
  }[value]
}

export function capabilityProposalStatusLabel(value: CapabilityProposal['status']): string {
  return {
    supported: 'Phù hợp với mức đã khai báo',
    higher_evidence: 'Đề xuất mức cao hơn (chưa áp dụng)',
    lower_evidence: 'Đề xuất mức thấp hơn (chưa áp dụng)',
    insufficient_evidence: 'Chưa đủ căn cứ xếp mức',
  }[value]
}
